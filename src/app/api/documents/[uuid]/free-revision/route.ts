import { headers } from "next/headers";
import { customAuth } from "@/lib/auth";
import { manageFreeRevision } from "@/models/free-revision";
import { findUserByUuid } from "@/models/user";

async function handle(request: Request, params: Promise<{ uuid: string }>, abandon: boolean) {
  try {
    const session = await customAuth.api.getSession({ headers: await headers() });
    if (!session?.user?.uuid) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await findUserByUuid(session.user.uuid);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { uuid } = await params;
    const data = await manageFreeRevision(uuid, user.uuid!, abandon ? "abandon" : "status");
    return Response.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "暂时无法确认免费优化资格，请留在当前页面重试。" }, { status: 409 });
  }
}
export function GET(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  return handle(request, params, false);
}
export function POST(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  return handle(request, params, true);
}
