import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import {
  canResendEmailRegistrationCode,
  createEmailRegistrationVerification,
  deleteEmailRegistrationVerification,
  emailRegistrationConfig,
  findEmailRegistrationVerification,
  generateEmailRegistrationCode,
} from "@/lib/email-registration";
import { findUserByEmail } from "@/models/user";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_CREDENTIALS_EMAIL_PASSWORD_AUTH_ENABLED !== "true") {
      return NextResponse.json(
        { success: false, message: "Email password registration is disabled" },
        { status: 403 }
      );
    }

    const { email } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    if (await findUserByEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    const existingVerification = await findEmailRegistrationVerification(normalizedEmail);
    if (
      existingVerification?.created_at &&
      !canResendEmailRegistrationCode(existingVerification.created_at)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `验证码发送过于频繁，请等待 ${emailRegistrationConfig.resendSeconds} 秒后重试`,
        },
        { status: 429 }
      );
    }

    const code = generateEmailRegistrationCode();
    await createEmailRegistrationVerification(normalizedEmail, code);

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Essmote AI 邮箱注册验证码",
        text: `您的邮箱注册验证码是 ${code}，${emailRegistrationConfig.expiresMinutes} 分钟内有效。`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 12px;">邮箱注册验证码</h2>
            <p>您好，</p>
            <p>您正在注册 Essmote AI 账号。</p>
            <p>您的验证码是：</p>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</div>
            <p>验证码将在 ${emailRegistrationConfig.expiresMinutes} 分钟后失效。</p>
            <p>如果这不是您的操作，请忽略此邮件。</p>
          </div>
        `,
      });
    } catch (error) {
      const verification = await findEmailRegistrationVerification(normalizedEmail);
      if (verification?.id) {
        await deleteEmailRegistrationVerification(verification.id);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "验证码已发送，请查收邮件",
    });
  } catch (error) {
    console.error("Send registration code error:", error);
    return NextResponse.json(
      { success: false, message: "验证码发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}
