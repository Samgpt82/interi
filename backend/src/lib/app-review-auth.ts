type EmailOTPType = "sign-in" | "email-verification" | "forget-password" | "change-email";

interface AppReviewAuthConfig {
  otp?: string;
}

const APP_REVIEW_EMAIL = "appreview@interi.app";

interface OTPRequest {
  email: string;
  type: EmailOTPType;
}

export function createAppReviewAuth(config: AppReviewAuthConfig) {
  const reviewOTP = config.otp;
  const enabled = Boolean(reviewOTP);

  const isReviewSignIn = ({ email, type }: OTPRequest): boolean =>
    enabled && type === "sign-in" && email.trim().toLowerCase() === APP_REVIEW_EMAIL;

  const generateOTP = (request: OTPRequest): string | undefined =>
    isReviewSignIn(request) ? reviewOTP : undefined;

  return { isReviewSignIn, generateOTP };
}
