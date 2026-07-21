import { getAffiliateSummary, getUserAffiliates } from "@/models/affiliate";
import { getUserUuid } from "@/services/user";
import { getAffiliateSettings } from "@/models/affiliate-settings";

import Invite from "@/components/invite";
import TableBlock from "@/components/blocks/table";
import { TableColumn } from "@/types/blocks/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { findUserByUuid } from "@/models/user";
import { getTranslations } from "next-intl/server";
import moment from "moment";
import { redirect } from "next/navigation";

const SERVICE_LABELS: Record<string, string> = {
  ps_sop: "PS/SOP",
  recommendation: "推荐信",
  cover_letter: "Cover Letter",
  resume: "简历",
  universal: "通用",
};

export default async function MyInvitesPage() {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();

  const callbackUrl = "/my-invites";
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await findUserByUuid(user_uuid);
  if (!user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const affiliates = await getUserAffiliates(user_uuid);
  const summary = await getAffiliateSummary(user_uuid);
  const settings = await getAffiliateSettings();

  const rewardQuotas = settings?.reward_quotas || {};

  const formatQuotaReward = (itemQuotas?: Record<string, number>) => {
    const quotas = itemQuotas || rewardQuotas;
    const entries = Object.entries(quotas).filter(([_, v]) => v > 0);
    if (entries.length === 0) return "服务次数奖励";
    return entries.map(([type, count]) => `${SERVICE_LABELS[type] || type}×${count}`).join("、");
  };

  const columns: TableColumn[] = [
    {
      name: "created_at",
      title: t("my_invites.table.invite_time"),
      callback: (item: any) =>
        moment.utc(item.created_at).utcOffset(8).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      name: "user",
      title: t("my_invites.table.invite_user"),
      callback: (item: any) => (
        <div className="flex items-center gap-2">
          {item?.user?.avatar_url && (
            <img
              src={item.user?.avatar_url || ""}
              className="w-8 h-8 rounded-full"
              alt=""
            />
          )}
          <span>{item.user?.nickname || item.user?.email || "用户"}</span>
        </div>
      ),
    },
    {
      name: "status",
      title: t("my_invites.table.status"),
      callback: (item: any) =>
        item.status === "pending"
          ? t("my_invites.table.pending")
          : t("my_invites.table.completed"),
    },
    {
      name: "reward",
      title: "奖励内容",
      callback: (item: any) =>
        item.status === "completed" ? formatQuotaReward(item.reward_quotas) : "-",
    },
  ];

  const table: TableSlotType = {
    title: t("my_invites.title"),
    description: t("my_invites.description"),
    columns: columns,
    data: affiliates,
    empty_message: t("my_invites.no_invites"),
  };

  return (
    <div className="space-y-8">
      <Invite
        summary={summary}
        rewardType="service_quota"
        rewardValue={settings?.reward_value || 0}
        rewardQuotas={rewardQuotas}
      />
      <TableBlock {...table} />
    </div>
  );
}
