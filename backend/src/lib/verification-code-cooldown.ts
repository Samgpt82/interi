const resendAvailableAt = new Map<string, number>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getVerificationCodeRetryAfterSeconds(email: string, now = Date.now()): number {
  const normalizedEmail = normalizeEmail(email);
  const availableAt = resendAvailableAt.get(normalizedEmail) ?? 0;
  if (availableAt <= now) {
    resendAvailableAt.delete(normalizedEmail);
    return 0;
  }
  return Math.ceil((availableAt - now) / 1000);
}

export function startVerificationCodeCooldown(email: string, cooldownMs: number, now = Date.now()): void {
  const normalizedEmail = normalizeEmail(email);
  resendAvailableAt.set(normalizedEmail, now + cooldownMs);
  setTimeout(() => {
    if ((resendAvailableAt.get(normalizedEmail) ?? 0) <= Date.now()) {
      resendAvailableAt.delete(normalizedEmail);
    }
  }, cooldownMs);
}

export function clearVerificationCodeCooldown(email: string): void {
  resendAvailableAt.delete(normalizeEmail(email));
}
