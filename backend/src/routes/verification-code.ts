import { Hono } from "hono";

import { auth, type AppEnv } from "../auth";
import {
  sendVerificationCodeEmail,
  VerificationEmailError,
} from "../services/verification-email";
import { requestVerificationCodeSchema } from "../types";

const verificationCodeRouter = new Hono<AppEnv>();
const resendAvailableAt = new Map<string, number>();
const RESEND_COOLDOWN_MS = 30_000;

verificationCodeRouter.post("/", async (c) => {
  c.header("Cache-Control", "no-store");

  const body = await c.req.json().catch(() => null);
  const parsed = requestVerificationCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { message: "Enter a valid email address.", code: "INVALID_EMAIL" } },
      400
    );
  }

  const { email } = parsed.data;
  const now = Date.now();
  const availableAt = resendAvailableAt.get(email) ?? 0;
  if (availableAt > now) {
    const retryAfterSeconds = Math.ceil((availableAt - now) / 1000);
    c.header("Retry-After", String(retryAfterSeconds));
    return c.json(
      {
        error: {
          message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          code: "VERIFICATION_CODE_RATE_LIMITED",
        },
      },
      429
    );
  }

  resendAvailableAt.set(email, now + RESEND_COOLDOWN_MS);

  try {
    const otp = await auth.api.createVerificationOTP({
      body: { email, type: "sign-in" },
      headers: c.req.raw.headers,
    });
    await sendVerificationCodeEmail(email, otp);
    return c.json({ data: { success: true as const } });
  } catch (error) {
    resendAvailableAt.delete(email);
    console.error("Failed to send verification code", error);

    if (error instanceof VerificationEmailError && error.status === 429) {
      return c.json(
        {
          error: {
            message: "Too many verification emails have been requested. Please try again later.",
            code: "EMAIL_QUOTA_EXCEEDED",
          },
        },
        429
      );
    }

    return c.json(
      {
        error: {
          message: "The verification email could not be sent. Please try again in a moment.",
          code: "EMAIL_DELIVERY_FAILED",
        },
      },
      502
    );
  }
});

export { verificationCodeRouter };
