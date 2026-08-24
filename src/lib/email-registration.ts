import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getIsoTimestr } from "@/lib/time";
import { getSupabaseClient } from "@/models/db";

const EMAIL_REGISTRATION_PREFIX = "email_registration:";
const EMAIL_REGISTRATION_EXPIRES_MINUTES = 10;
const EMAIL_REGISTRATION_RESEND_SECONDS = 60;
const EMAIL_REGISTRATION_MAX_ATTEMPTS = 5;

export function getEmailRegistrationIdentifier(email: string) {
  return `${EMAIL_REGISTRATION_PREFIX}${email.trim().toLowerCase()}`;
}

export function generateEmailRegistrationCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export async function findEmailRegistrationVerification(email: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("verification")
    .select("*")
    .eq("identifier", getEmailRegistrationIdentifier(email))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createEmailRegistrationVerification(email: string, code: string) {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = getEmailRegistrationIdentifier(normalizedEmail);
  const now = new Date();
  const nowIso = getIsoTimestr();
  const expiresAt = new Date(
    now.getTime() + EMAIL_REGISTRATION_EXPIRES_MINUTES * 60 * 1000
  ).toISOString();
  const codeHash = await hashPassword(code);

  await supabase.from("verification").delete().eq("identifier", identifier);

  const { error } = await supabase.from("verification").insert({
    id: uuidv4(),
    identifier,
    value: JSON.stringify({
      email: normalizedEmail,
      codeHash,
      type: "email_registration",
      attempts: 0,
    }),
    expires_at: expiresAt,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (error) {
    throw error;
  }
}

export async function verifyEmailRegistrationCode(email: string, code: string) {
  const verification = await findEmailRegistrationVerification(email);
  if (!verification) {
    return { ok: false, reason: "not_found" as const };
  }

  if (new Date(verification.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" as const, verification };
  }

  let parsedValue: {
    codeHash?: string;
    type?: string;
    email?: string;
    attempts?: number;
  } | null = null;
  try {
    parsedValue = JSON.parse(verification.value);
  } catch {
    return { ok: false, reason: "invalid" as const, verification };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (
    parsedValue?.type !== "email_registration" ||
    parsedValue?.email !== normalizedEmail ||
    !parsedValue?.codeHash
  ) {
    return { ok: false, reason: "invalid" as const, verification };
  }

  const attempts = Number(parsedValue.attempts || 0);
  if (attempts >= EMAIL_REGISTRATION_MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" as const, verification };
  }

  const matched = await verifyPassword(code, parsedValue.codeHash);
  if (!matched) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("verification")
      .update({
        value: JSON.stringify({ ...parsedValue, attempts: attempts + 1 }),
        updated_at: getIsoTimestr(),
      })
      .eq("id", verification.id);

    if (error) {
      throw error;
    }

    return { ok: false, reason: "mismatch" as const, verification };
  }

  return { ok: true as const, verification };
}

export async function deleteEmailRegistrationVerification(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("verification").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export function canResendEmailRegistrationCode(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() >= EMAIL_REGISTRATION_RESEND_SECONDS * 1000;
}

export const emailRegistrationConfig = {
  expiresMinutes: EMAIL_REGISTRATION_EXPIRES_MINUTES,
  resendSeconds: EMAIL_REGISTRATION_RESEND_SECONDS,
  maxAttempts: EMAIL_REGISTRATION_MAX_ATTEMPTS,
};
