import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { checkAndDeductQuota } from "@/lib/check-quota";

export async function POST(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json({ code: -1, message: "请先登录" }, { status: 401 });
    }

    const { function_type } = await req.json();
    if (!function_type) {
      return respErr("缺少 function_type 参数");
    }

    const result = await checkAndDeductQuota(userUuid, function_type);
    if (!result.ok) {
      return Response.json({ code: -1, message: result.message }, { status: 402 });
    }

    return respData({ success: true, service_type: result.deductedServiceType });
  } catch (error: any) {
    return respErr("扣除配额失败: " + error.message);
  }
}
