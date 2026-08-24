"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SiGithub, SiGoogle } from "react-icons/si";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CacheKey } from "@/services/constant";

type SocialProvider = "github" | "google";
type FormMode = "signin" | "signup" | "forgot";

export default function SignForm({
  callbackUrl,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  callbackUrl?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isZh = locale.startsWith("zh");
  const copy = useMemo(
    () => ({
      passwordRequired: isZh ? "请输入密码" : "Please enter your password",
      passwordLabel: isZh ? "密码" : "Password",
      loginSuccess: isZh ? "登录成功" : "Signed in successfully",
      loginFailed: isZh ? "登录失败，请重试" : "Sign in failed. Please try again.",
      sessionNotReady: isZh
        ? "登录会话创建失败，请重试"
        : "Your sign-in session could not be verified. Please try again.",
      registerSuccess: isZh ? "注册成功，请使用新账号登录" : "Registration successful. Please sign in.",
      registerFailed: isZh ? "注册失败，请重试" : "Registration failed. Please try again.",
      resetTitle: isZh ? "找回密码" : "Reset password",
      resetHint: isZh ? "输入邮箱、验证码和新密码来重置。" : "Enter your email, verification code, and new password to reset.",
      forgotPassword: isZh ? "忘记密码？" : "Forgot password?",
      sendCode: isZh ? "发送验证码" : "Send code",
      resendCode: isZh ? "重新发送" : "Resend",
      sendingCode: isZh ? "发送中..." : "Sending...",
      codeLabel: isZh ? "验证码" : "Verification code",
      codePlaceholder: isZh ? "请输入 6 位验证码" : "Enter 6-digit code",
      newPasswordLabel: isZh ? "新密码" : "New password",
      newPasswordPlaceholder: isZh ? "至少 8 位，包含字母和数字" : "At least 8 characters with letters and numbers",
      resetPassword: isZh ? "重置密码" : "Reset password",
      resettingPassword: isZh ? "重置中..." : "Resetting...",
      backToLogin: isZh ? "返回登录" : "Back to sign in",
      noAccount: isZh ? "没有账号？立即注册" : "No account? Sign up",
      hasAccount: isZh ? "已有账号？立即登录" : "Already have an account? Sign in",
      nicknameLabel: isZh ? "昵称（可选）" : "Nickname (optional)",
      nicknamePlaceholder: isZh ? "输入昵称（2-20 个字符）" : "Enter nickname (2-20 characters)",
      checkingNickname: isZh ? "检查中..." : "Checking...",
      nicknameAvailable: isZh ? "可用" : "Available",
      nicknameUnavailable: isZh ? "已被占用" : "Unavailable",
      invalidNickname: isZh ? "请选择一个可用的昵称" : "Please choose an available nickname",
      socialFailed: isZh ? "社交登录失败，请重试" : "Social sign in failed. Please try again.",
      socialMissingRedirect: isZh ? "未获取到跳转地址" : "Social sign in did not return a redirect URL.",
      sendCodeSuccess: isZh ? "验证码已发送，请查收邮件" : "Verification code sent. Please check your email.",
      resetSuccess: isZh ? "密码已重置，请使用新密码登录" : "Password reset. Please sign in with your new password.",
    }),
    [isZh]
  );

  const [mode, setMode] = useState<FormMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingRegistrationCode, setIsSendingRegistrationCode] = useState(false);
  const [registrationCodeCooldown, setRegistrationCodeCooldown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [sendCodeCooldown, setSendCodeCooldown] = useState(0);
  const [nicknameStatus, setNicknameStatus] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: "",
  });

  const isGoogleEnabled =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false" &&
    Boolean(process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID);
  const isGithubEnabled =
    process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED !== "false" &&
    Boolean(process.env.NEXT_PUBLIC_AUTH_GITHUB_ID);
  const isCredentialsEnabled =
    process.env.NEXT_PUBLIC_CREDENTIALS_EMAIL_PASSWORD_AUTH_ENABLED === "true";

  // 自动读取缓存的邀请码
  useEffect(() => {
    try {
      const cachedCode = cacheGet(CacheKey.InviteCode);
      if (cachedCode) {
        setInviteCode(cachedCode);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (sendCodeCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSendCodeCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sendCodeCooldown]);

  useEffect(() => {
    if (registrationCodeCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRegistrationCodeCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [registrationCodeCooldown]);

  const normalizeCallbackUrl = useCallback((value?: string | null) => {
    const fallbackUrl = `/${locale}`;

    if (!value) {
      return fallbackUrl;
    }

    try {
      const baseOrigin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost";
      const parsedUrl = new URL(value, baseOrigin);
      const nextUrl = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

      if (
        !nextUrl.startsWith("/") ||
        /^\/([a-z]{2}(?:-[A-Z]{2})?)?\/?auth\/signin(?:[/?#]|$)/.test(nextUrl)
      ) {
        return fallbackUrl;
      }

      return nextUrl;
    } catch {
      return fallbackUrl;
    }
  }, [locale]);

  const validateEmail = () => {
    if (!email || email.trim() === "") {
      toast.error(t("sign_modal.email_required"));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error(t("sign_modal.email_invalid"));
      return false;
    }

    return true;
  };

  const debounceCheckNickname = useCallback((nextNickname: string) => {
    const timer = window.setTimeout(async () => {
      if (!nextNickname || nextNickname.trim().length < 2) {
        setNicknameStatus({ isChecking: false, isAvailable: null, message: "" });
        return;
      }

      setNicknameStatus((prev) => ({ ...prev, isChecking: true }));

      try {
        const response = await fetch("/api/auth/check-nickname", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nickname: nextNickname.trim() }),
        });

        const result = await response.json();
        setNicknameStatus({
          isChecking: false,
          isAvailable: Boolean(result.available),
          message: result.message || "",
        });
      } catch (error) {
        console.error("Check nickname error:", error);
        setNicknameStatus({
          isChecking: false,
          isAvailable: null,
          message: isZh ? "昵称检查失败" : "Nickname check failed",
        });
      }
    }, 500);

    return timer;
  }, [isZh]);

  useEffect(() => {
    if (mode !== "signup" || !isCredentialsEnabled || !nickname) {
      return;
    }

    const timer = debounceCheckNickname(nickname);
    return () => window.clearTimeout(timer);
  }, [debounceCheckNickname, isCredentialsEnabled, mode, nickname]);

  const getPostSignInUrl = useCallback(() => {
    if (typeof window === "undefined") {
      return normalizeCallbackUrl(callbackUrl);
    }

    const currentUrl = new URL(window.location.href);
    return normalizeCallbackUrl(
      callbackUrl || currentUrl.searchParams.get("callbackUrl")
    );
  }, [callbackUrl, normalizeCallbackUrl]);

  const handleSocialSignIn = useCallback(
    async (provider: SocialProvider) => {
      if (isLoading) {
        return;
      }

      setIsLoading(true);

      try {
        const callbackURL = getPostSignInUrl();
        if (typeof document !== "undefined") {
          document.cookie = `app.auth_callback_url=${encodeURIComponent(callbackURL)}; Path=/; Max-Age=600; SameSite=Lax`;
        }

        const errorCallbackURL =
          typeof window !== "undefined"
            ? `${window.location.origin}/${locale}/auth/signin`
            : `/${locale}/auth/signin`;

        const result = await authClient.signIn.social({
          provider,
          callbackURL,
          errorCallbackURL,
        });

        const redirectUrl = (result as any)?.data?.url || (result as any)?.url;
        if (!redirectUrl) {
          toast.error(copy.socialMissingRedirect);
          return;
        }

        window.location.assign(redirectUrl);
      } catch (error) {
        console.error(`${provider} sign in error:`, error);
        toast.error(copy.socialFailed);
      } finally {
        setIsLoading(false);
      }
    },
    [copy.socialFailed, copy.socialMissingRedirect, getPostSignInUrl, isLoading, locale]
  );

  const handleCredentialsSignIn = async () => {
    if (!validateEmail()) {
      return;
    }

    if (!password || password.trim() === "") {
      toast.error(copy.passwordRequired);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || copy.loginFailed);
        return;
      }

      const waitForSessionReady = async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          try {
            const sessionResponse = await fetch("/api/auth/get-session", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });

            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              if (sessionData?.user?.email) {
                return true;
              }
            }
          } catch (sessionError) {
            console.error("Session verification error:", sessionError);
          }

          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }

        return false;
      };

      const sessionReady = await waitForSessionReady();
      if (!sessionReady) {
        toast.error(copy.sessionNotReady);
        return;
      }

      const targetUrl = getPostSignInUrl();
      toast.success(copy.loginSuccess);
      window.location.replace(targetUrl);
    } catch (error) {
      console.error("Credentials sign in error:", error);
      toast.error(copy.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateEmail()) {
      return;
    }

    if (!password || password.trim() === "") {
      toast.error(copy.passwordRequired);
      return;
    }

    if (!registrationCode.trim()) {
      toast.error(isZh ? "请输入验证码" : "Please enter the verification code");
      return;
    }

    if (nickname && nickname.trim() && nicknameStatus.isAvailable === false) {
      toast.error(copy.invalidNickname);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          code: registrationCode.trim(),
          nickname: nickname.trim() || email.trim().split("@")[0],
          invite_code: inviteCode.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || copy.registerFailed);
        return;
      }

      // 缓存邀请码，登录后自动绑定邀请关系
      if (inviteCode.trim()) {
        cacheSet(CacheKey.InviteCode, inviteCode.trim(), Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
      }

      toast.success(copy.registerSuccess);
      setMode("signin");
      setPassword("");
      setNickname("");
      setInviteCode("");
      setRegistrationCode("");
      setNicknameStatus({ isChecking: false, isAvailable: null, message: "" });
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(copy.registerFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRegistrationCode = async () => {
    if (
      !validateEmail() ||
      isSendingRegistrationCode ||
      registrationCodeCooldown > 0
    ) {
      return;
    }

    setIsSendingRegistrationCode(true);

    try {
      const response = await fetch("/api/auth/register/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || copy.registerFailed);
        return;
      }

      toast.success(result.message || copy.sendCodeSuccess);
      setRegistrationCodeCooldown(60);
    } catch (error) {
      console.error("Send registration code error:", error);
      toast.error(copy.registerFailed);
    } finally {
      setIsSendingRegistrationCode(false);
    }
  };

  const handleSendResetCode = async () => {
    if (!validateEmail() || isSendingCode || sendCodeCooldown > 0) {
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/password-reset/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || copy.loginFailed);
        return;
      }

      toast.success(result.message || copy.sendCodeSuccess);
      setSendCodeCooldown(60);
    } catch (error) {
      console.error("Send reset code error:", error);
      toast.error(copy.loginFailed);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) {
      return;
    }

    if (!resetCode.trim()) {
      toast.error(isZh ? "请输入验证码" : "Please enter the verification code");
      return;
    }

    if (!resetPassword.trim()) {
      toast.error(isZh ? "请输入新密码" : "Please enter your new password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: resetCode.trim(),
          password: resetPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || copy.loginFailed);
        return;
      }

      toast.success(result.message || copy.resetSuccess);
      setMode("signin");
      setPassword("");
      setResetCode("");
      setResetPassword("");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(copy.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCredentialsForm = () => {
    if (!isCredentialsEnabled) {
      return null;
    }

    if (mode === "forgot") {
      return (
        <>
          <div className="grid gap-2">
            <Label htmlFor="reset-email">{t("sign_modal.email_label")}</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reset-code">{copy.codeLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="reset-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={copy.codePlaceholder}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendResetCode}
                disabled={isSendingCode || sendCodeCooldown > 0}
                className="shrink-0"
              >
                {isSendingCode
                  ? copy.sendingCode
                  : sendCodeCooldown > 0
                    ? `${copy.resendCode} (${sendCodeCooldown}s)`
                    : copy.sendCode}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reset-password">{copy.newPasswordLabel}</Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showResetPassword ? "text" : "password"}
                placeholder={copy.newPasswordPlaceholder}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showResetPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowResetPassword((prev) => !prev)}
              >
                {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button onClick={handleResetPassword} className="w-full h-12" disabled={isLoading}>
            {isLoading ? copy.resettingPassword : copy.resetPassword}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setMode("signin");
              setShowResetPassword(false);
              setShowPassword(false);
            }}
          >
            {copy.backToLogin}
          </Button>
        </>
      );
    }

    return (
      <>
        <div className="grid gap-2">
          <Label htmlFor="email">{t("sign_modal.email_label")}</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode === "signup" && (
          <div className="grid gap-2">
            <Label htmlFor="registration-code">{copy.codeLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="registration-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder={copy.codePlaceholder}
                value={registrationCode}
                onChange={(e) => setRegistrationCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendRegistrationCode}
                disabled={isSendingRegistrationCode || registrationCodeCooldown > 0}
                className="shrink-0"
              >
                {isSendingRegistrationCode
                  ? copy.sendingCode
                  : registrationCodeCooldown > 0
                    ? `${copy.resendCode} (${registrationCodeCooldown}s)`
                    : copy.sendCode}
              </Button>
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div className="grid gap-2">
            <Label htmlFor="nickname">
              {copy.nicknameLabel}
              {nicknameStatus.isChecking && (
                <span className="text-blue-500 text-xs ml-2">{copy.checkingNickname}</span>
              )}
              {nicknameStatus.isAvailable === true && (
                <span className="text-green-500 text-xs ml-2">{copy.nicknameAvailable}</span>
              )}
              {nicknameStatus.isAvailable === false && (
                <span className="text-red-500 text-xs ml-2">{copy.nicknameUnavailable}</span>
              )}
            </Label>
            <Input
              id="nickname"
              type="text"
              placeholder={copy.nicknamePlaceholder}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={cn(
                nicknameStatus.isAvailable === false && "border-red-500",
                nicknameStatus.isAvailable === true && "border-green-500"
              )}
            />
            {nicknameStatus.message && (
              <p
                className={cn(
                  "text-xs",
                  nicknameStatus.isAvailable === false && "text-red-500",
                  nicknameStatus.isAvailable === true && "text-green-500"
                )}
              >
                {nicknameStatus.message}
              </p>
            )}
          </div>
        )}

        {mode === "signup" && (
          <div className="grid gap-2">
            <Label htmlFor="inviteCode">
              {isZh ? "邀请码（可选）" : "Invite code (optional)"}
            </Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder={isZh ? "输入邀请码可获得额外奖励" : "Enter invite code for bonus"}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>
        )}

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{copy.passwordLabel}</Label>
            {mode === "signin" && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("forgot")}
              >
                {copy.forgotPassword}
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={mode === "signup" ? copy.newPasswordPlaceholder : copy.passwordLabel}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          onClick={mode === "signup" ? handleRegister : handleCredentialsSignIn}
          className="w-full h-12"
          disabled={isLoading || (mode === "signup" && nicknameStatus.isAvailable === false)}
        >
          {isLoading
            ? mode === "signup"
              ? (isZh ? "注册中..." : "Signing up...")
              : (isZh ? "登录中..." : "Signing in...")
            : mode === "signup"
              ? (isZh ? "注册账号" : "Create account")
              : (isZh ? "使用邮箱登录" : "Sign in with email")}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setPassword("");
            setShowPassword(false);
            setShowResetPassword(false);
            setNickname("");
            setRegistrationCode("");
            setResetCode("");
            setSendCodeCooldown(0);
            setRegistrationCodeCooldown(0);
            setNicknameStatus({ isChecking: false, isAvailable: null, message: "" });
          }}
        >
          {mode === "signup" ? copy.hasAccount : copy.noAccount}
        </Button>
      </>
    );
  };

  const hasOtherAuthMethods = isGithubEnabled || isGoogleEnabled;
  const showSocial = mode !== "forgot";
  const showDivider = showSocial && hasOtherAuthMethods && isCredentialsEnabled;

  return (
    <Card className={cn("border-0 shadow-none", className)} {...props}>
      <CardHeader className="p-0">
        {showSocial && (
          <div className="flex flex-col space-y-2 text-center">
            {isGithubEnabled && (
              <Button
                variant="outline"
                className="w-full h-12 flex items-center gap-2"
                disabled={isLoading}
                onClick={() => handleSocialSignIn("github")}
              >
                <SiGithub className="w-4 h-4" />
                {t("sign_modal.github_sign_in")}
              </Button>
            )}

            {isGoogleEnabled && (
              <Button
                variant="outline"
                className="w-full h-12 flex items-center gap-2"
                disabled={isLoading}
                onClick={() => handleSocialSignIn("google")}
              >
                <SiGoogle className="w-4 h-4" />
                {t("sign_modal.google_sign_in")}
              </Button>
            )}
          </div>
        )}

        {showDivider && (
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("sign_modal.or_continue_with")}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="grid gap-4">
        {mode === "forgot" && (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{copy.resetTitle}</div>
            <div>{copy.resetHint}</div>
          </div>
        )}

        {renderCredentialsForm()}

        <p className="px-8 pt-4 text-center text-sm text-muted-foreground">
          {t("sign_modal.agreement_prefix")}{" "}
          <Link href="/terms-of-service" className="underline underline-offset-4 hover:text-primary">
            {t("sign_modal.terms")}
          </Link>{" "}
          {t("sign_modal.and")}{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
            {t("sign_modal.privacy")}
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
