import { respData, respErr } from "@/lib/resp";
import { getUserInfo } from "@/services/user";
import { getOneYearLaterTimestr } from "@/lib/time";
import {
  getUserQuotaSummary,
  addAdminQuota,
  removeAdminQuota,
  ServiceType,
} from "@/models/service-quota";

const VALID_SERVICE_TYPES: ServiceType[] = [
  "ps_sop",
  "recommendation",
  "cover_letter",
  "resume",
  "universal",
];

async function checkAdmin() {
  const userInfo = await getUserInfo();
  if (!userInfo?.email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(userInfo.email);
}

export async function POST(req: Request) {
  try {
    if (!(await checkAdmin())) {
      return respErr("无权限", 403);
    }

    const { user_uuid, service_type, amount } = await req.json();

    if (!user_uuid || !service_type || amount === undefined || amount === null) {
      return respErr("缺少必要参数");
    }

    if (!VALID_SERVICE_TYPES.includes(service_type)) {
      return respErr("无效的服务类型");
    }

    const change = Number(amount);
    if (isNaN(change) || change === 0 || !Number.isInteger(change)) {
      return respErr("次数必须为非零整数");
    }

    if (change > 0) {
      await addAdminQuota(
        user_uuid,
        service_type as ServiceType,
        change,
        getOneYearLaterTimestr()
      );
    } else {
      const removed = await removeAdminQuota(
        user_uuid,
        service_type as ServiceType,
        Math.abs(change)
      );
      if (!removed) {
        return respErr("减少次数不能超过用户当前可用次数");
      }
    }

    const updatedQuotas = await getUserQuotaSummary(user_uuid);

    return respData({
      quotas: updatedQuotas,
      service_type,
      amount: Math.abs(change),
      action: change > 0 ? "add" : "remove",
    });
  } catch (error: any) {
    console.error("修改配额失败:", error);
    return respErr("修改配额失败: " + error.message);
  }
}
