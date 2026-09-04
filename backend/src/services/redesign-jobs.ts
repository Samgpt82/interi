import { createHash } from "node:crypto";

import { Prisma, type RedesignJob } from "@prisma/client";

import { claimFreeDesign, getDesignAccess, releaseFreeDesign } from "../lib/design-access";
import { prisma } from "../prisma";
import {
  persistedRedesignRequestSchema,
  redesignJobStatusSchema,
  redesignRoomResultSchema,
  designAccessResponseSchema,
  type DesignAccessResponse,
  type RedesignJobRequest,
  type RedesignJobResponse,
} from "../types";
import { generateRedesign, normalizeRedesignError, RedesignServiceError } from "./redesign-generation";
import { cleanupStoredFiles, downloadImage, type StoredFile, uploadImage } from "./storage";

const JOB_RETRY_AFTER_MS = 1_500;
const JOB_HEARTBEAT_MS = 30_000;
const JOB_LEASE_TIMEOUT_MS = 2 * 60_000;
const JOB_RETENTION_MS = 7 * 24 * 60 * 60_000;
const WORKER_SWEEP_MS = 30_000;
const CLEANUP_SWEEP_MS = 6 * 60 * 60_000;
const MAX_CONCURRENT_JOBS = 2;
const activeJobs = new Set<string>();
const queuedJobs = new Set<string>();
let jobSweepInFlight = false;
let cleanupSweepInFlight = false;

const jobResponseSelect = {
  id: true,
  status: true,
  resultJson: true,
  errorCode: true,
  errorMessage: true,
  retryable: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RedesignJobSelect;
const jobLookupSelect = {
  ...jobResponseSelect,
  requestFingerprint: true,
} satisfies Prisma.RedesignJobSelect;

type JobResponseRecord = Prisma.RedesignJobGetPayload<{ select: typeof jobResponseSelect }>;

export class SubscriptionRequiredError extends Error {
  constructor() {
    super("Your three free designs have been used. Choose a plan to continue.");
    this.name = "SubscriptionRequiredError";
  }
}

export class RedesignRequestConflictError extends Error {
  constructor() {
    super("This redesign request was already used with different options. Please start again.");
    this.name = "RedesignRequestConflictError";
  }
}

export function serializeRedesignJob(job: JobResponseRecord): RedesignJobResponse {
  const parsedStatus = redesignJobStatusSchema.safeParse(job.status);
  let status = parsedStatus.success ? parsedStatus.data : "failed";
  let result = null;
  let invalidResult = false;

  if (status === "succeeded") {
    try {
      const parsedResult = redesignRoomResultSchema.safeParse(
        job.resultJson ? JSON.parse(job.resultJson) : null
      );
      if (parsedResult.success) result = parsedResult.data;
      else {
        invalidResult = true;
        console.error("Stored redesign job result failed validation", job.id, parsedResult.error.issues);
      }
    } catch (error) {
      invalidResult = true;
      console.error("Stored redesign job result is invalid JSON", job.id, error);
    }
    if (invalidResult) status = "failed";
  }

  return {
    id: job.id,
    status,
    result,
    error: status === "failed"
      ? {
          message: invalidResult
            ? "The completed redesign could not be loaded. Please start again."
            : job.errorMessage ?? "The redesign could not be completed.",
          code: invalidResult ? "INVALID_JOB_RESULT" : job.errorCode ?? "REDESIGN_FAILED",
          retryable: invalidResult ? false : job.retryable,
        }
      : null,
    retryAfterMs: status === "queued" || status === "processing" ? JOB_RETRY_AFTER_MS : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function findRedesignJobForUser(jobId: string, userId: string) {
  return prisma.redesignJob.findFirst({
    where: { id: jobId, userId },
    select: jobResponseSelect,
  });
}

export async function findRedesignJobByClientRequestId(clientRequestId: string, userId: string) {
  return prisma.redesignJob.findUnique({
    where: { userId_clientRequestId: { userId, clientRequestId } },
    select: jobLookupSelect,
  });
}

async function reserveAccess(
  tx: Prisma.TransactionClient,
  userId: string,
  accessMode: RedesignJobRequest["accessMode"]
): Promise<{ designAccess: DesignAccessResponse; claimedFreeDesign: boolean }> {
  if (accessMode === "free") {
    const designAccess = await claimFreeDesign(userId, tx);
    if (!designAccess) throw new SubscriptionRequiredError();
    return { designAccess, claimedFreeDesign: true };
  }

  return {
    designAccess: await getDesignAccess(userId, tx),
    claimedFreeDesign: false,
  };
}

export function getRedesignRequestFingerprint(request: RedesignJobRequest): string {
  return createHash("sha256").update(JSON.stringify({
    sourceImageDataUrl: request.sourceImageDataUrl,
    style: request.style,
    roomType: request.roomType,
    shoppingCountry: request.shoppingCountry,
    refinement: request.refinement ?? null,
    accessMode: request.accessMode,
  })).digest("hex");
}

export async function createRedesignJob(
  userId: string,
  request: RedesignJobRequest
): Promise<{ job: JobResponseRecord; created: boolean }> {
  const requestFingerprint = getRedesignRequestFingerprint(request);
  const existing = await findRedesignJobByClientRequestId(request.clientRequestId, userId);
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) throw new RedesignRequestConflictError();
    return { job: existing, created: false };
  }

  if (request.accessMode === "free") {
    const designAccess = await getDesignAccess(userId);
    if (designAccess.freeDesignsRemaining === 0) throw new SubscriptionRequiredError();
  }

  const sourceFile = await uploadImage(
    request.sourceImageDataUrl,
    `interi-redesign-source-${request.clientRequestId}.jpg`
  );

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.redesignJob.findUnique({
        where: { userId_clientRequestId: { userId, clientRequestId: request.clientRequestId } },
        select: jobLookupSelect,
      });
      if (duplicate) {
        if (duplicate.requestFingerprint !== requestFingerprint) throw new RedesignRequestConflictError();
        return { job: duplicate, created: false };
      }

      const { designAccess, claimedFreeDesign } = await reserveAccess(tx, userId, request.accessMode);
      const job = await tx.redesignJob.create({
        data: {
          userId,
          clientRequestId: request.clientRequestId,
          requestFingerprint,
          sourceImageUrl: sourceFile.url,
          sourceImageFileId: sourceFile.id,
          style: request.style,
          roomType: request.roomType,
          shoppingCountry: request.shoppingCountry,
          refinement: request.refinement,
          accessMode: request.accessMode,
          designAccessJson: JSON.stringify(designAccess),
          freeDesignClaimed: claimedFreeDesign,
        },
        select: jobResponseSelect,
      });
      return { job, created: true };
    });
    if (!outcome.created) await cleanupStoredFiles([sourceFile.id]);
    return outcome;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await findRedesignJobByClientRequestId(request.clientRequestId, userId);
      if (duplicate) {
        if (duplicate.requestFingerprint !== requestFingerprint) throw new RedesignRequestConflictError();
        await cleanupStoredFiles([sourceFile.id]);
        return { job: duplicate, created: false };
      }
    }
    await cleanupStoredFiles([sourceFile.id]);
    throw error;
  }
}

async function failJob(jobId: string, leaseToken: string, error: unknown): Promise<void> {
  const serviceError = normalizeRedesignError(error);
  const sourceFileId = await prisma.$transaction(async (tx) => {
    const job = await tx.redesignJob.findFirst({
      where: { id: jobId, status: "processing", leaseToken },
      select: { userId: true, sourceImageFileId: true, freeDesignClaimed: true },
    });
    if (!job) return null;

    const updated = await tx.redesignJob.updateMany({
      where: { id: jobId, status: "processing", leaseToken },
      data: {
        status: "failed",
        leaseToken: null,
        errorCode: serviceError.code,
        errorMessage: serviceError.message,
        retryable: serviceError.retryable,
        freeDesignClaimed: false,
        completedAt: new Date(),
      },
    });
    if (updated.count === 0) return null;

    if (job.freeDesignClaimed) await releaseFreeDesign(job.userId, tx);
    return job.sourceImageFileId;
  });

  if (sourceFileId) await cleanupStoredFiles([sourceFileId]);
}

async function completeJob(
  job: RedesignJob,
  leaseToken: string,
  generatedFile: StoredFile,
  resultJson: string
): Promise<void> {
  const updated = await prisma.redesignJob.updateMany({
    where: { id: job.id, status: "processing", leaseToken },
    data: {
      status: "succeeded",
      leaseToken: null,
      resultImageUrl: generatedFile.url,
      resultImageFileId: generatedFile.id,
      resultJson,
      errorCode: null,
      errorMessage: null,
      retryable: false,
      completedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    await cleanupStoredFiles([generatedFile.id]);
    return;
  }
  await cleanupStoredFiles([job.sourceImageFileId]);
}

async function processRedesignJob(jobId: string): Promise<void> {
  const leaseToken = crypto.randomUUID();
  const staleBefore = new Date(Date.now() - JOB_LEASE_TIMEOUT_MS);
  const claimed = await prisma.redesignJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: "queued" },
        { status: "processing", updatedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: "processing",
      leaseToken,
      attempts: { increment: 1 },
      startedAt: new Date(),
      completedAt: null,
      errorCode: null,
      errorMessage: null,
      retryable: false,
    },
  });
  if (claimed.count === 0) return;

  const job = await prisma.redesignJob.findFirst({
    where: { id: jobId, status: "processing", leaseToken },
  });
  if (!job) return;

  const heartbeat = setInterval(() => {
    void prisma.redesignJob.updateMany({
      where: { id: job.id, status: "processing", leaseToken },
      data: { updatedAt: new Date() },
    }).catch((error) => console.error("Unable to update redesign job heartbeat", job.id, error));
  }, JOB_HEARTBEAT_MS);

  try {
    const requestResult = persistedRedesignRequestSchema.safeParse({
      style: job.style,
      roomType: job.roomType,
      shoppingCountry: job.shoppingCountry,
      refinement: job.refinement ?? undefined,
      accessMode: job.accessMode,
    });
    if (!requestResult.success) {
      throw new RedesignServiceError(
        "The saved redesign request is invalid. Please start again.",
        "INVALID_STORED_REQUEST",
        false
      );
    }

    const parsedAccess = designAccessResponseSchema.safeParse(JSON.parse(job.designAccessJson));
    if (!parsedAccess.success) {
      throw new RedesignServiceError(
        "The saved redesign access record is invalid. Please start again.",
        "INVALID_STORED_ACCESS",
        false
      );
    }

    let imageFile: File;
    try {
      imageFile = await downloadImage(job.sourceImageUrl, `room-${job.id}.jpg`);
    } catch (error) {
      console.error("Unable to download redesign source image", job.id, error);
      throw new RedesignServiceError(
        "The room image is temporarily unavailable. Please try again.",
        "SOURCE_IMAGE_UNAVAILABLE",
        true
      );
    }

    const request = {
      ...requestResult.data,
      sourceImageDataUrl: job.sourceImageUrl,
    };
    const generated = await generateRedesign(request, imageFile, parsedAccess.data, {
      idempotencyKey: job.clientRequestId,
    });
    const generatedFile = await uploadImage(
      generated.imageDataUrl,
      `interi-redesign-result-${job.clientRequestId}.jpg`
    );
    const result = { ...generated, imageDataUrl: generatedFile.url };
    try {
      await completeJob(job, leaseToken, generatedFile, JSON.stringify(result));
    } catch (error) {
      await cleanupStoredFiles([generatedFile.id]);
      throw error;
    }
  } catch (error) {
    console.error("Redesign job failed", { jobId: job.id, error });
    await failJob(job.id, leaseToken, error);
  } finally {
    clearInterval(heartbeat);
  }
}

function pumpRedesignJobs(): void {
  while (activeJobs.size < MAX_CONCURRENT_JOBS) {
    const jobId = queuedJobs.values().next().value as string | undefined;
    if (!jobId) return;

    queuedJobs.delete(jobId);
    activeJobs.add(jobId);
    void processRedesignJob(jobId)
      .catch((error) => console.error("Unable to process redesign job", jobId, error))
      .finally(() => {
        activeJobs.delete(jobId);
        pumpRedesignJobs();
      });
  }
}

export function ensureRedesignJobProcessing(jobId: string): void {
  if (activeJobs.has(jobId) || queuedJobs.has(jobId)) return;
  queuedJobs.add(jobId);
  pumpRedesignJobs();
}

export function resumeRedesignJobIfNeeded(job: Pick<JobResponseRecord, "id" | "status" | "updatedAt">): void {
  const leaseExpired = job.status === "processing" && Date.now() - job.updatedAt.getTime() >= JOB_LEASE_TIMEOUT_MS;
  if (job.status === "queued" || leaseExpired) ensureRedesignJobProcessing(job.id);
}

async function cleanupExpiredJobs(): Promise<void> {
  const expired = await prisma.redesignJob.findMany({
    where: {
      completedAt: { lt: new Date(Date.now() - JOB_RETENTION_MS) },
      status: { in: ["succeeded", "failed"] },
    },
    select: { id: true, sourceImageFileId: true, resultImageFileId: true },
    take: 50,
  });
  if (expired.length === 0) return;

  const cleanedJobIds: string[] = [];
  for (const job of expired) {
    const cleaned = await cleanupStoredFiles([job.sourceImageFileId, job.resultImageFileId]);
    if (cleaned) cleanedJobIds.push(job.id);
  }
  if (cleanedJobIds.length > 0) {
    await prisma.redesignJob.deleteMany({ where: { id: { in: cleanedJobIds } } });
  }
}

async function sweepRedesignJobs(): Promise<void> {
  const jobs = await prisma.redesignJob.findMany({
    where: {
      OR: [
        { status: "queued" },
        { status: "processing", updatedAt: { lt: new Date(Date.now() - JOB_LEASE_TIMEOUT_MS) } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const job of jobs) ensureRedesignJobProcessing(job.id);
}

async function runJobSweep(): Promise<void> {
  if (jobSweepInFlight) return;
  jobSweepInFlight = true;
  try {
    await sweepRedesignJobs();
  } finally {
    jobSweepInFlight = false;
  }
}

async function runCleanupSweep(): Promise<void> {
  if (cleanupSweepInFlight) return;
  cleanupSweepInFlight = true;
  try {
    await cleanupExpiredJobs();
  } finally {
    cleanupSweepInFlight = false;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __interiRedesignWorkerStarted: boolean | undefined;
}

export function startRedesignJobWorker(): void {
  if (globalThis.__interiRedesignWorkerStarted) return;
  globalThis.__interiRedesignWorkerStarted = true;

  void runJobSweep().catch((error) => console.error("Unable to recover redesign jobs", error));
  void runCleanupSweep().catch((error) => console.error("Unable to clean up redesign jobs", error));

  const workerTimer = setInterval(() => {
    void runJobSweep().catch((error) => console.error("Unable to sweep redesign jobs", error));
  }, WORKER_SWEEP_MS);
  workerTimer.unref?.();

  const cleanupTimer = setInterval(() => {
    void runCleanupSweep().catch((error) => console.error("Unable to clean up redesign jobs", error));
  }, CLEANUP_SWEEP_MS);
  cleanupTimer.unref?.();
}
