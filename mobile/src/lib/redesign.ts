import { ApiError, api, isApiError } from '@/lib/api/api';
import { prepareImageForUpload } from '@/lib/image-utils';
import type { RedesignJobRequest, RedesignJobResponse, RedesignRequest, RedesignResponse } from '@/lib/interi';

const DEFAULT_POLL_DELAY_MS = 1_500;
const MAX_POLL_DELAY_MS = 5_000;
const MAX_GENERATION_WAIT_MS = 9 * 60_000;
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class RedesignJobFailedError extends ApiError {}

export function createRedesignRequestId() {
  return `redesign-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isTransientError(error: unknown) {
  return !isApiError(error) || TRANSIENT_STATUSES.has(error.status);
}

function completedResult(job: RedesignJobResponse): RedesignResponse | null {
  if (job.status !== 'succeeded') return null;
  if (!job.result) {
    throw new ApiError('The completed redesign could not be loaded. Please try again.', 502, 'INVALID_JOB_RESULT');
  }
  return job.result;
}

export async function createRedesign(
  request: RedesignRequest,
  clientRequestId = createRedesignRequestId(),
): Promise<RedesignResponse> {
  const jobRequest: RedesignJobRequest = {
    ...request,
    sourceImageDataUrl: await prepareImageForUpload(request.sourceImageDataUrl),
    clientRequestId,
  };
  const startedAt = Date.now();
  let job = await api.post<RedesignJobResponse>('/api/redesign/jobs', jobRequest, { retryTransient: true });

  for (let pollAttempt = 0; Date.now() - startedAt < MAX_GENERATION_WAIT_MS; pollAttempt += 1) {
    const result = completedResult(job);
    if (result) return result;

    if (job.status === 'failed') {
      throw new RedesignJobFailedError(
        job.error?.message ?? 'The redesign could not be completed. Please try again.',
        job.error?.retryable ? 503 : 422,
        job.error?.code ?? 'REDESIGN_FAILED',
      );
    }

    const requestedDelay = job.retryAfterMs ?? DEFAULT_POLL_DELAY_MS;
    const backoffDelay = Math.min(DEFAULT_POLL_DELAY_MS + pollAttempt * 250, MAX_POLL_DELAY_MS);
    await wait(Math.max(requestedDelay, backoffDelay));

    try {
      job = await api.get<RedesignJobResponse>(`/api/redesign/jobs/${job.id}`);
    } catch (error) {
      if (!isTransientError(error)) throw error;
    }
  }

  throw new ApiError(
    'The redesign is still taking longer than expected. Please try again in a moment.',
    504,
    'REDESIGN_POLL_TIMEOUT',
  );
}
