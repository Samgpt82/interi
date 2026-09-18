import { describe, expect, test } from "bun:test";

import { createAppReviewAuth } from "./app-review-auth";

const reviewAuth = createAppReviewAuth({ otp: "135790" });

describe("App Review authentication", () => {
  test("uses the configured OTP for the exact normalized review email", () => {
    expect(
      reviewAuth.generateOTP({
        email: " AppReview@Interi.App ",
        type: "sign-in",
      })
    ).toBe("135790");
  });

  test("does not use the review OTP for another email", () => {
    expect(
      reviewAuth.generateOTP({
        email: "appreview+other@interi.app",
        type: "sign-in",
      })
    ).toBeUndefined();
  });

  test("does not use the review OTP for another OTP purpose", () => {
    expect(
      reviewAuth.generateOTP({
        email: "appreview@interi.app",
        type: "email-verification",
      })
    ).toBeUndefined();
  });

  test("is disabled when the server-side OTP is not configured", () => {
    expect(
      createAppReviewAuth({}).generateOTP({
        email: "appreview@interi.app",
        type: "sign-in",
      })
    ).toBeUndefined();
  });
});
