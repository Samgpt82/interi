import { api } from '@/lib/api/api';

interface VerificationCodeResponse {
  success: true;
}

export async function requestVerificationCode(email: string) {
  return api.post<VerificationCodeResponse>('/api/verification-code', { email });
}
