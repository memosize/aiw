const HTML_TAG_PATTERN = /<!DOCTYPE html>|<html[\s>]|<head[\s>]|<body[\s>]/i;

function stripHtmlTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeErrorMessage(
  value: unknown,
  fallback = "Service is temporarily unavailable. Please try again shortly."
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (HTML_TAG_PATTERN.test(trimmed)) {
    const lowered = trimmed.toLowerCase();

    if (lowered.includes("bad gateway") || lowered.includes("error code 502")) {
      return "Service is temporarily unavailable. Please try again shortly.";
    }

    if (lowered.includes("gateway time-out") || lowered.includes("error code 504")) {
      return "Service timed out. Please try again shortly.";
    }

    if (lowered.includes("cloudflare")) {
      return "Upstream service is temporarily unavailable. Please try again shortly.";
    }

    const plainText = stripHtmlTags(trimmed);
    return plainText || fallback;
  }

  return trimmed;
}
