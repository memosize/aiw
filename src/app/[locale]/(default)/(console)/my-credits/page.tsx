import Empty from "@/components/blocks/empty";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getTranslations } from "next-intl/server";
import { getUserUuid } from "@/services/user";
import { getUserQuotaSummary, getQuotaRecordsByUserUuid } from "@/models/service-quota";
import moment from "moment";

export default async function () {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();

  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  const quotaSummary = await getUserQuotaSummary(user_uuid);
  const quotaRecords = await getQuotaRecordsByUserUuid(user_uuid, 1, 100);

  const serviceLabels: Record<string, string> = {
    ps_sop: "PS/SOP",
    recommendation: t("my_credits.service_types.recommendation"),
    cover_letter: "Cover Letter",
    resume: t("my_credits.service_types.resume"),
    universal: t("my_credits.service_types.universal"),
  };

  const quotaDisplay = Object.entries(quotaSummary)
    .filter(([_, count]) => count > 0)
    .map(([type, count]: [string, number]) => `${serviceLabels[type] || type}: ${count}${t("my_credits.unit")}`)
    .join("  |  ");

  const table: TableSlotType = {
    title: t("my_credits.title"),
    tip: {
      title: quotaDisplay
        ? `${t("my_credits.remaining")} — ${quotaDisplay}`
        : t("my_credits.no_quota"),
    },
    toolbar: {
      items: [
        {
          title: t("my_credits.recharge"),
          url: "/pricing",
          target: "_blank",
          icon: "RiBankCardLine",
        },
      ],
    },
    columns: [
      {
        title: t("my_credits.table.service_type"),
        name: "service_type",
        callback: (v: any) => {
          return serviceLabels[v.service_type] || v.service_type;
        },
      },
      {
        title: t("my_credits.table.remaining"),
        name: "remaining",
        callback: (v: any) => {
          return `${v.remaining}${t("my_credits.unit")}`;
        },
      },
      {
        title: t("my_credits.table.expired_at"),
        name: "expired_at",
        callback: (v: any) => {
          if (!v.expired_at) return "-";
          const expDate = moment.utc(v.expired_at).utcOffset(8);
          const isExpired = expDate.isBefore(moment());
          const formatted = expDate.format("YYYY-MM-DD");
          if (isExpired) {
            return `${formatted} (${t("my_credits.expired")})`;
          }
          return formatted;
        },
      },
      {
        title: t("my_credits.table.created_at"),
        name: "created_at",
        callback: (v: any) => {
          return moment.utc(v.created_at).utcOffset(8).format("YYYY-MM-DD HH:mm:ss");
        },
      },
    ],
    data: quotaRecords,
    empty_message: t("my_credits.no_credits"),
  };

  return (
    <div className="space-y-6">
      {/* 服务配额卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
        {Object.entries(serviceLabels).map(([type, label]: [string, string]) => (
          <div
            key={type}
            className="rounded-lg border border-border bg-card p-4 text-center text-card-foreground shadow-sm"
          >
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-card-foreground">
              {quotaSummary[type as keyof typeof quotaSummary] || 0}
            </p>
            <p className="text-xs text-muted-foreground">{t("my_credits.remaining_unit")}</p>
          </div>
        ))}
      </div>

      <TableSlot {...table} />
    </div>
  );
}
