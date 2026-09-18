import { Hono } from "hono";

import { appReviewAuth, auth, type AppEnv } from "../auth";
import { clearVerificationCodeCooldown } from "../lib/verification-code-cooldown";

const authRouter = new Hono<AppEnv>();

authRouter.post("/email-otp/send-verification-otp", async (c) => {
  const body = (await c.req.raw.clone().json().catch(() => null)) as
    | { email?: unknown; type?: unknown }
    | null;
  if (
    typeof body?.email === "string" &&
    body.type === "sign-in" &&
    appReviewAuth.isReviewSignIn({ email: body.email, type: body.type })
  ) {
    return c.json({ success: true });
  }

  return auth.handler(c.req.raw);
});

authRouter.post("/sign-in/email-otp", async (c) => {
  const body = (await c.req.raw.clone().json().catch(() => null)) as
    | { email?: unknown }
    | null;
  const isReviewSignIn =
    typeof body?.email === "string" &&
    appReviewAuth.isReviewSignIn({ email: body.email, type: "sign-in" });
  const response = await auth.handler(c.req.raw);
  if (isReviewSignIn && response.ok) {
    clearVerificationCodeCooldown(body.email as string);
  }
  return response;
});

authRouter.on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));

export { authRouter };
