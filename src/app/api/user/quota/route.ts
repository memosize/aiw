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
    const response = respData(summary);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: any) {
    const response = respErr("暂时无法读取次数，请稍后重试。", 503);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
