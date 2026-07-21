import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/models/db";
import { findUserByEmail, insertUser } from "@/models/user";
import { getIsoTimestr } from "@/lib/time";
import { v4 as uuidv4 } from "uuid";
import { createRequire } from "module";
import { symmetricDecrypt } from "better-auth/crypto";
import path from "path";

const requireFromHere = createRequire(import.meta.url);

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  locale?: string;
};

type BetterAuthOAuthState = {
  codeVerifier?: string;
};

async function fetchWithProxy(input: string, init?: RequestInit) {
  // Production: direct fetch (no proxy needed)
  if (process.env.NODE_ENV === "production") {
    return fetch(input, init);
  }

  // Development: try proxy if available
  try {
    const undiciPath = path.resolve(
      process.cwd(),
      "node_modules/.pnpm/node_modules/undici"
    );
    const { ProxyAgent, fetch: undiciFetch } = requireFromHere(undiciPath) as {
      ProxyAgent: new (url: string) => unknown;
      fetch: typeof fetch;
    };

    const proxyCandidates = [
      process.env.AUTH_PROXY_URL,
      process.env.HTTPS_PROXY,
      process.env.HTTP_PROXY,
    ].filter(Boolean) as string[];

    for (const proxyUrl of proxyCandidates) {
      try {
        const response = await undiciFetch(input, {
          ...(init || {}),
          dispatcher: new ProxyAgent(proxyUrl),
        } as RequestInit & { dispatcher: unknown });
        return response as Response;
      } catch {
        // try next proxy
      }
    }
  } catch {
    // undici not available, use direct fetch
  }

  return fetch(input, init);
}

function getBaseUrl(request: NextRequest) {
  const requestOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  return (
    requestOrigin ||
    process.env.NEXT_PUBLIC_WEB_URL ||
    process.env.AUTH_URL?.replace(/\/api\/auth\/?$/, "")
  ).replace(/\/+$/, "");
}

function getRedirectUri(request: NextRequest) {
  return `${getBaseUrl(request)}/api/auth/callback/google`;
}

function getCallbackUrl(request: NextRequest) {
  const cookieValue = request.cookies.get("app.auth_callback_url")?.value;

  if (!cookieValue) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
      const url = new URL(decoded);
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }

    return decoded.startsWith("/") ? decoded : "/";
  } catch {
    return "/";
  }
}

function getCookieValueBySuffix(request: NextRequest, suffix: string) {
  const exactMatch = request.cookies.get(suffix)?.value;
  if (exactMatch) {
    return exactMatch;
  }

  const matchingCookies = request.cookies
    .getAll()
    .filter((cookie) => cookie.name === suffix || cookie.name.endsWith(`.${suffix}`))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (matchingCookies.length === 0) {
    return undefined;
  }

  return matchingCookies.map((cookie) => cookie.value).join("");
}

async function getCodeVerifier(request: NextRequest) {
  const encryptedState = getCookieValueBySuffix(request, "oauth_state");
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;

  if (!encryptedState || !secret) {
    return undefined;
  }

  try {
    const decryptedState = await symmetricDecrypt({
      key: secret,
      data: encryptedState,
    });
    const parsedState = JSON.parse(decryptedState) as BetterAuthOAuthState;

    return parsedState.codeVerifier;
  } catch (error) {
    console.error("[google-callback] failed to parse oauth state", error);
    return undefined;
  }
}

async function exchangeCodeForTokens(request: NextRequest, code: string) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const codeVerifier = await getCodeVerifier(request);

  if (!clientId || !clientSecret) {
    throw new Error("Google auth credentials are not configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(request),
    grant_type: "authorization_code",
  });

  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const response = await fetchWithProxy("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token exchange failed with status ${response.status}: ${errorText}`
    );
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(tokens: GoogleTokenResponse) {
  const response = await fetchWithProxy(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`User info request failed with status ${response.status}`);
  }

  return (await response.json()) as GoogleUserInfo;
}

function buildNickname(userInfo: GoogleUserInfo) {
  const base = userInfo.name?.trim() || userInfo.email.split("@")[0] || "google-user";

  return base.slice(0, 20);
}

export async function GET(request: NextRequest) {
  const callbackUrl = getCallbackUrl(request);
  const signinUrl = `/auth/signin?error=invalid_code`;

  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(new URL(signinUrl, getBaseUrl(request)));
    }

    const tokens = await exchangeCodeForTokens(request, code);
    const userInfo = await fetchGoogleUserInfo(tokens);

    if (!userInfo.email || !userInfo.sub) {
      return NextResponse.redirect(new URL(signinUrl, getBaseUrl(request)));
    }

    const supabase = getSupabaseClient();
    const now = getIsoTimestr();

    let user = await findUserByEmail(userInfo.email);

    if (!user) {
      const userUuid = uuidv4();

      await insertUser({
        uuid: userUuid,
        email: userInfo.email,
        nickname: buildNickname(userInfo),
        avatar_url: userInfo.picture || "",
        locale: userInfo.locale,
        signin_type: "oauth",
        signin_provider: "google",
        signin_openid: userInfo.sub,
        signin_ip:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "::1",
        email_verified: Boolean(userInfo.email_verified),
        created_at: now,
        updated_at: now,
      });

      user = await findUserByEmail(userInfo.email);
    } else {
      await supabase
        .from("users")
        .update({
          avatar_url: user.avatar_url || userInfo.picture || "",
          locale: user.locale || userInfo.locale,
          email_verified: user.email_verified || Boolean(userInfo.email_verified),
          updated_at: now,
        })
        .eq("uuid", user.uuid);
    }

    if (!user?.uuid) {
      throw new Error("Unable to resolve user after Google sign in");
    }

    const existingAccountResp = await supabase
      .from("account")
      .select("id")
      .eq("provider_id", "google")
      .eq("account_id", userInfo.sub)
      .maybeSingle();

    const accountPayload = {
      user_id: user.uuid,
      account_id: userInfo.sub,
      provider_id: "google",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      id_token: tokens.id_token || null,
      scope: tokens.scope || null,
      access_token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      updated_at: now,
    };

    if (existingAccountResp.data?.id) {
      await supabase
        .from("account")
        .update(accountPayload)
        .eq("id", existingAccountResp.data.id);
    } else {
      await supabase.from("account").insert({
        id: uuidv4(),
        ...accountPayload,
        created_at: now,
      });
    }

    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("session").insert({
      id: uuidv4(),
      user_id: user.uuid,
      token: sessionToken,
      expires_at: expiresAt,
      ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "::1",
      user_agent: request.headers.get("user-agent") || "",
      created_at: now,
      updated_at: now,
    });

    const response = NextResponse.redirect(new URL(callbackUrl, getBaseUrl(request)));

    response.cookies.set("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    if (process.env.NODE_ENV === "production") {
      response.cookies.set("__Secure-better-auth.session_token", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }
    response.cookies.delete("better-auth.state");
    response.cookies.delete("better-auth.oauth_state");
    response.cookies.delete("app.auth_callback_url");

    return response;
  } catch (error) {
    console.error("[google-callback] failed", error);

    const response = NextResponse.redirect(new URL(signinUrl, getBaseUrl(request)));
    response.cookies.delete("app.auth_callback_url");
    return response;
  }
}
