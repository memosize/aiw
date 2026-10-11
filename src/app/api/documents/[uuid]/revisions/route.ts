import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { customAuth } from "@/lib/auth";
import { findDocumentByUuid, createDocumentRevision, getDocumentRevisionCount } from "@/models/document";
import { manageFreeRevision, REVISION_DOCUMENT_TYPES } from "@/models/free-revision";
import { findUserByUuid } from "@/models/user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await customAuth.api.getSession({ headers: await headers() });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserByUuid(session.user.uuid!);
    if (!user) {
      return NextResponse.json({
        error: "Session expired, please sign in again",
        code: "SESSION_EXPIRED"
      }, { status: 401 });
    }

    const { uuid } = await params;
    const body = await request.json();
    const { content, revision_settings, revision_token } = body;

    // Verify document belongs to user
    const document = await findDocumentByUuid(uuid);
    if (!document || document.user_uuid !== user.uuid) {
      return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 404 });
    }

    const supported = Object.values(REVISION_DOCUMENT_TYPES).includes(document.document_type);
    if (supported && (typeof content !== "string" ||
        (typeof revision_token !== "string" && typeof revision_settings?.restored_from !== "string"))) {
      return NextResponse.json({ error: "请从成稿页完成免费全文优化" }, { status: 400 });
    }
    const restoring = typeof revision_settings?.restored_from === "string";
    let revision;
    if (!supported) {
      // Preserve the existing revision path for unrelated document types.
      if (await getDocumentRevisionCount(uuid) >= 1) {
        return NextResponse.json({ error: "Free revision already used" }, { status: 403 });
      }
      revision = await createDocumentRevision(uuid, content, revision_settings);
    } else {
      revision = await manageFreeRevision(uuid, user.uuid!, restoring ? "restore" : "save",
        restoring ? revision_settings.restored_from : revision_token, content, revision_settings);
    }

    return NextResponse.json({ 
      success: true, 
      data: revision 
    });
  } catch (error) {
    console.error("Error creating revision:", error);
    if (error instanceof Error && /FREE_REVISION_UNAVAILABLE|INVALID_REVISION_TOKEN/.test(error.message)) {
      return NextResponse.json({ error: "本篇免费优化不可重复使用" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to create revision" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await customAuth.api.getSession({ headers: await headers() });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserByUuid(session.user.uuid!);
    if (!user) {
      return NextResponse.json({
        error: "Session expired, please sign in again",
        code: "SESSION_EXPIRED"
      }, { status: 401 });
    }

    const { uuid } = await params;

    // Verify document belongs to user
    const document = await findDocumentByUuid(uuid);
    if (!document || document.user_uuid !== user.uuid) {
      return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 404 });
    }

    const supported = Object.values(REVISION_DOCUMENT_TYPES).includes(document.document_type);
    const revisionCount = supported ? 0 : await getDocumentRevisionCount(uuid);
    const info = supported ? await manageFreeRevision(uuid, user.uuid!, "status") : {
      revision_count: revisionCount, has_used_free_revision: revisionCount >= 1,
    };

    return NextResponse.json({ 
      success: true, 
      data: {
        ...info
      }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error getting revision info:", error);
    return NextResponse.json(
      { error: "Failed to get revision info" },
      { status: 500 }
    );
  }
}