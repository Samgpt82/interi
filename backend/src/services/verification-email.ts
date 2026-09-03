const OTP_EMAIL_URL = "https://smtp.vibecodeapp.com/v1/send/otp";
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
    const response = await fetch(OTP_EMAIL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        code,
        fromName: "Interi",
        lang: "en",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new VerificationEmailError(
        data?.error ?? `Email service returned HTTP ${response.status}`,
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
