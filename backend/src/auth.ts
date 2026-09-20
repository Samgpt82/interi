import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";

import { env } from "./env";
import { createAppReviewAuth } from "./lib/app-review-auth";
import { prisma } from "./prisma";
import { sendVerificationCodeEmail } from "./services/verification-email";

export const appReviewAuth = createAppReviewAuth({
  otp: env.APP_REVIEW_OTP,
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,
  trustedOrigins: [
    "vibecode://*/*",
    "exp://*/*",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.dev.vibecode.run",
    "https://*.vibecode.run",
    "https://*.vibecodeapp.com",
    "https://*.vibecode.dev",
    "https://vibecode.dev",
    "https://interi.app",
    "https://interi-aw5.pages.dev",
    "https://*.interi-aw5.pages.dev",
  ],
  plugins: [
    expo(),
    emailOTP({
      storeOTP: "hashed",
      generateOTP: (request) => appReviewAuth.generateOTP(request),
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in" || appReviewAuth.isReviewSignIn({ email, type })) return;

        await sendVerificationCodeEmail(email, String(otp));
      },
    }),
  ],
  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
});

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};
