import { respData, respErr } from "@/lib/resp";
import { DocumentType, findDocumentByUuid } from "@/models/document";
import { refundQuota } from "@/models/service-quota";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json({ code: -1, message: "请先登录" }, { status: 401 });
    }

    const { document_uuid: documentUuid } = await req.json();
    if (typeof documentUuid !== "string" || !documentUuid) {
      return respErr("缺少 document_uuid 参数");
    }

    const document = await findDocumentByUuid(documentUuid);
    if (!document || document.user_uuid !== userUuid) {
      return Response.json({ code: -1, message: "文档不存在或无权访问" }, { status: 404 });
    }

    if (document.document_type !== DocumentType.PersonalStatement) {
      return respErr("仅支持返还 PS 生成次数");
    }

    const quotaServiceType = document.form_data?.quota_service_type;
    const serviceType = quotaServiceType === "universal" ? "universal" : "ps_sop";
    await refundQuota(userUuid, serviceType, `ps-generation-refund:${documentUuid}`);
    return respData({ success: true });
  } catch (error: any) {
    console.error("Failed to refund PS quota:", error);
    return respErr("返还生成次数失败: " + error.message);
  }
}
