import { getSupabaseClient } from "./db";

export const REVISION_DOCUMENT_TYPES: Record<string, string> = {
  "revise-personal-statement": "personal_statement",
  "revise-sop": "sop",
  "revise-cover-letter": "cover_letter",
  "revise-recommendation-letter": "recommendation_letter",
};

export async function manageFreeRevision(
  uuid: string, userUuid: string, action: "status" | "claim" | "abandon" | "release" | "ready" | "save" | "restore",
  token?: string, content?: string, settings?: unknown
) {
  const { data, error } = await getSupabaseClient().rpc("manage_document_free_revision", {
    p_uuid: uuid, p_user: userUuid, p_action: action, p_token: token ?? null,
    p_content: content ?? null, p_settings: settings ?? null,
  });
  if (error || !data) throw new Error(error?.message || "FREE_REVISION_STATE_UNAVAILABLE");
  return data;
}
