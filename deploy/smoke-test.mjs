// Read-only HTTP checks; no accounts, orders, or AI requests are created.
const base = new URL(process.argv[2] || "http://127.0.0.1:5180");
let failures = 0;
let home = "";

async function check(path, validate) {
  try {
    const response = await fetch(new URL(path, base), {
      signal: AbortSignal.timeout(30000),
      redirect: "manual",
    });
    const body = await response.text();
    if (!validate(response, body)) throw new Error(`HTTP ${response.status}`);
    console.log(`PASS ${path} (${response.status})`);
    return body;
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error.message}`);
    return "";
  }
}

for (const path of ["/", "/auth/signin", "/pricing", "/help", "/contact",
  "/privacy-policy", "/terms-of-service"]) {
  const body = await check(path, (r, text) =>
    r.status === 200 && text.includes("</html>") && !text.includes("NEXT_HTTP_ERROR_FALLBACK;500"));
  if (path === "/") home = body;
}

await check("/zh", (r) => {
  const destination = new URL(r.headers.get("location"), base);
  return r.status === 307 && destination.origin === base.origin && destination.pathname === "/";
});
await check("/en", (r) =>
  r.status === 200 && r.headers.get("set-cookie")?.includes("NEXT_LOCALE=en"));
await check("/en/auth/signin", (r) =>
  r.status === 200 && r.headers.get("set-cookie")?.includes("NEXT_LOCALE=en"));
for (const path of ["/personal-statement", "/sop", "/resume-generator",
  "/recommendation-letter", "/cover-letter"]) {
  await check(path, (r) => {
    const destination = new URL(r.headers.get("location"), base);
    return r.status === 307 && destination.origin === base.origin &&
      destination.pathname === "/auth/signin" && destination.searchParams.get("callbackUrl") === path;
  });
}

await check("/api/health", (r, text) => r.status === 200 && JSON.parse(text).status === "ok");
await check("/api/auth/get-session", (r, text) => r.status === 200 && JSON.parse(text) === null);
await check("/api/auth/callback/google", (r) => {
  const destination = new URL(r.headers.get("location"), base);
  return r.status === 307 && destination.origin === base.origin &&
    destination.pathname === "/auth/signin" && destination.searchParams.get("error") === "invalid_code";
});
await check("/api/user/quota", (r, text) => {
  const body = JSON.parse(text);
  return (r.status === 401 || body.code === 401) && !body.data;
});

const assets = [...new Set([...home.matchAll(/(?:src|href)="([^"<>]*\/_next\/static\/[^"<>]+)"/g)]
  .map((match) => match[1].replaceAll("&amp;", "&")))];
if (!assets.length) {
  failures++;
  console.error("FAIL no Next.js static assets found");
}
for (const asset of assets) {
  await check(asset, (r, text) => r.status === 200 && text.length > 0);
}
console.log(`Result: ${failures} failures; ${assets.length} static assets checked`);
process.exitCode = failures ? 1 : 0;
