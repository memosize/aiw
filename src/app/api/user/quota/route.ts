import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { getUserQuotaSummary } from "@/models/service-quota";

export async function GET() {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("请先登录", 401);
    }

    const summary = await getUserQuotaSummary(userUuid);
    return respData(summary);
  } catch (error: any) {
    return respErr("获取配额失败: " + error.message);
  }
}
