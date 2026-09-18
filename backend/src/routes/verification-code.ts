import { Hono } from "hono";

import { appReviewAuth, auth, type AppEnv } from "../auth";
import {
  sendVerificationCodeEmail,
  VerificationEmailError,
} from "../services/verification-email";
import {
  clearVerificationCodeCooldown,
  getVerificationCodeRetryAfterSeconds,
  startVerificationCodeCooldown,
} from "../lib/verification-code-cooldown";
import { requestVerificationCodeSchema } from "../types";

const verificationCodeRouter = new Hono<AppEnv>();
const RESEND_COOLDOWN_MS = 30_000;
const APP_REVIEW_RESEND_COOLDOWN_MS = 5 * 60_000;

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
  const otpRequest = { email, type: "sign-in" as const };
  const retryAfterSeconds = getVerificationCodeRetryAfterSeconds(email);
  if (retryAfterSeconds > 0) {
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

  const cooldownMs = appReviewAuth.isReviewSignIn(otpRequest)
    ? APP_REVIEW_RESEND_COOLDOWN_MS
    : RESEND_COOLDOWN_MS;
  startVerificationCodeCooldown(email, cooldownMs);

  try {
    const otp = await auth.api.createVerificationOTP({
      body: otpRequest,
      headers: c.req.raw.headers,
    });
    if (!appReviewAuth.isReviewSignIn(otpRequest)) {
      await sendVerificationCodeEmail(email, otp);
    }
    return c.json({ data: { success: true as const } });
  } catch (error) {
    clearVerificationCodeCooldown(email);
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
