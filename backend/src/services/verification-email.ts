import { env } from "../env";

const VIBECODE_OTP_EMAIL_URL = "https://smtp.vibecodeapp.com/v1/send/otp";
const RESEND_EMAIL_URL = "https://api.resend.com/emails";
const OTP_EMAIL_TIMEOUT_MS = 10_000;

export class VerificationEmailError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "VerificationEmailError";
    this.status = status;
  }
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OTP_EMAIL_TIMEOUT_MS);

  try {
    const useResend = Boolean(env.RESEND_API_KEY || env.RESEND_FROM_EMAIL);

    if (useResend && (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL)) {
      throw new VerificationEmailError("Resend email configuration is incomplete", 500);
    }

    const response = await fetch(useResend ? RESEND_EMAIL_URL : VIBECODE_OTP_EMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(useResend ? { Authorization: `Bearer ${env.RESEND_API_KEY}` } : {}),
      },
      body: JSON.stringify(
        useResend
          ? {
              from: env.RESEND_FROM_EMAIL,
              to: [email],
              subject: `${code} is Your Verification Code`,
              text: `Your Interi verification code is ${code}.`,
              html: `<p>Your Interi verification code is <strong>${code}</strong>.</p>`,
            }
          : {
              to: email,
              code,
              fromName: "Interi",
              lang: "en",
            }
      ),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
      throw new VerificationEmailError(
        data?.message ?? data?.error ?? `Email service returned HTTP ${response.status}`,
        response.status
      );
    }
  } catch (error) {
    if (error instanceof VerificationEmailError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new VerificationEmailError("Email service timed out", 504);
    }
    throw new VerificationEmailError(
      error instanceof Error ? error.message : "Email service request failed",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}
