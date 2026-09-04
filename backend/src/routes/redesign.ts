import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { AppEnv } from "../auth";
import { claimFreeDesign, getDesignAccess, releaseFreeDesign } from "../lib/design-access";
import { imageDataUrlToFile } from "../lib/image-data";
import {
  designInventoryRequestSchema,
  redesignJobRequestSchema,
  redesignRoomRequestSchema,
  SUBSCRIPTION_REQUIRED_ERROR_CODE,
  type DesignAccessResponse,
} from "../types";
import {
  generateRedesign,
  identifyDesignItems,
  normalizeRedesignError,
} from "../services/redesign-generation";
import {
  createRedesignJob,
  ensureRedesignJobProcessing,
  findRedesignJobByClientRequestId,
  findRedesignJobForUser,
  getRedesignRequestFingerprint,
  RedesignRequestConflictError,
  resumeRedesignJobIfNeeded,
  serializeRedesignJob,
  SubscriptionRequiredError,
} from "../services/redesign-jobs";
import {
  assertActiveSubscription,
  SubscriptionNotActiveError,
  SubscriptionVerificationError,
} from "../services/subscription-access";

const redesignRouter = new Hono<AppEnv>();

redesignRouter.use(
  "*",
  bodyLimit({
    maxSize: 18 * 1024 * 1024,
    onError: (c) => c.json(
      { error: { message: "The room image is too large.", code: "PAYLOAD_TOO_LARGE" } },
      413
    ),
  })
);

function unauthorized(c: Context<AppEnv>, message: string) {
  return c.json({ error: { message, code: "UNAUTHORIZED" } }, 401);
}

async function parseJson(c: Context<AppEnv>): Promise<{ value: unknown } | { response: Response }> {
  try {
    return { value: await c.req.json() };
  } catch {
    return {
      response: c.json(
        { error: { message: "Request body must be valid JSON", code: "INVALID_JSON" } },
        400
      ),
    };
  }
}

redesignRouter.post("/items", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c, "Please sign in to view design items.");

  const parsedBody = await parseJson(c);
  if ("response" in parsedBody) return parsedBody.response;

  const parsed = designInventoryRequestSchema.safeParse(parsedBody.value);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid design inventory request",
          code: "INVALID_REQUEST",
        },
      },
      400
    );
  }

  try {
    const items = await identifyDesignItems(parsed.data);
    return c.json({ data: items });
  } catch (error) {
    const serviceError = normalizeRedesignError(error);
    console.error("Unexpected design inventory error", error);
    c.header("Retry-After", "5");
    return c.json(
      { error: { message: serviceError.message, code: serviceError.code } },
      503
    );
  }
});

redesignRouter.post("/jobs", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c, "Please sign in to create room designs.");

  const parsedBody = await parseJson(c);
  if ("response" in parsedBody) return parsedBody.response;

  const parsed = redesignJobRequestSchema.safeParse(parsedBody.value);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid redesign request",
          code: "INVALID_REQUEST",
        },
      },
      400
    );
  }

  try {
    const requestFingerprint = getRedesignRequestFingerprint(parsed.data);
    const existing = await findRedesignJobByClientRequestId(parsed.data.clientRequestId, user.id);
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) throw new RedesignRequestConflictError();
      resumeRedesignJobIfNeeded(existing);
      return c.json({ data: serializeRedesignJob(existing) });
    }

    if (parsed.data.accessMode === "subscription") await assertActiveSubscription(user.id);
    const { job, created } = await createRedesignJob(user.id, parsed.data);
    if (created) ensureRedesignJobProcessing(job.id);
    else resumeRedesignJobIfNeeded(job);

    c.header("Location", `/api/redesign/jobs/${job.id}`);
    if (job.status === "queued" || job.status === "processing") c.header("Retry-After", "2");
    return c.json({ data: serializeRedesignJob(job) }, created ? 202 : 200);
  } catch (error) {
    if (error instanceof RedesignRequestConflictError) {
      return c.json(
        { error: { message: error.message, code: "IDEMPOTENCY_CONFLICT" } },
        409
      );
    }
    if (error instanceof SubscriptionRequiredError || error instanceof SubscriptionNotActiveError) {
      return c.json(
        {
          error: {
            message: error.message,
            code: SUBSCRIPTION_REQUIRED_ERROR_CODE,
          },
        },
        402
      );
    }
    if (error instanceof SubscriptionVerificationError) {
      c.header("Retry-After", "10");
      return c.json(
        { error: { message: error.message, code: "SUBSCRIPTION_CHECK_FAILED" } },
        503
      );
    }

    console.error("Unable to create redesign job", error);
    c.header("Retry-After", "5");
    return c.json(
      {
        error: {
          message: "Unable to start the redesign right now. Please try again.",
          code: "JOB_CREATE_FAILED",
        },
      },
      503
    );
  }
});

redesignRouter.get("/jobs/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c, "Please sign in to view room designs.");

  const job = await findRedesignJobForUser(c.req.param("id"), user.id);
  if (!job) {
    return c.json(
      { error: { message: "This redesign could not be found.", code: "JOB_NOT_FOUND" } },
      404
    );
  }

  resumeRedesignJobIfNeeded(job);
  c.header("Cache-Control", "no-store");
  if (job.status === "queued" || job.status === "processing") c.header("Retry-After", "2");
  return c.json({ data: serializeRedesignJob(job) });
});

// Compatibility for already-installed app builds. This path keeps its original
// short timeout; current builds use durable jobs and polling instead.
redesignRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c, "Please sign in to create room designs.");

  const parsedBody = await parseJson(c);
  if ("response" in parsedBody) return parsedBody.response;

  const parsed = redesignRoomRequestSchema.safeParse(parsedBody.value);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid redesign request",
          code: "INVALID_REQUEST",
        },
      },
      400
    );
  }

  const imageFile = imageDataUrlToFile(parsed.data.sourceImageDataUrl);
  if (!imageFile) {
    return c.json(
      { error: { message: "The room image could not be decoded", code: "INVALID_IMAGE" } },
      400
    );
  }

  let designAccess: DesignAccessResponse;
  let claimedFreeDesign = false;
  try {
    if (parsed.data.accessMode === "subscription") await assertActiveSubscription(user.id);
    if (parsed.data.accessMode === "free") {
      const claimedAccess = await claimFreeDesign(user.id);
      if (!claimedAccess) {
        return c.json(
          {
            error: {
              message: "Your three free designs have been used. Choose a plan to continue.",
              code: SUBSCRIPTION_REQUIRED_ERROR_CODE,
            },
          },
          402
        );
      }
      designAccess = claimedAccess;
      claimedFreeDesign = true;
    } else {
      designAccess = await getDesignAccess(user.id);
    }
  } catch (error) {
    if (error instanceof SubscriptionNotActiveError) {
      return c.json(
        { error: { message: error.message, code: SUBSCRIPTION_REQUIRED_ERROR_CODE } },
        402
      );
    }
    console.error("Unable to reserve design access", error);
    return c.json(
      { error: { message: "Unable to check design access right now.", code: "ACCESS_CHECK_FAILED" } },
      503
    );
  }

  try {
    const data = await generateRedesign(parsed.data, imageFile, designAccess, {
      idempotencyKey: crypto.randomUUID(),
      timeoutMs: 25_000,
      retryDelaysMs: [],
    });
    return c.json({ data });
  } catch (error) {
    if (claimedFreeDesign) {
      try {
        await releaseFreeDesign(user.id);
      } catch (releaseError) {
        console.error("Unable to restore free design credit", releaseError);
      }
    }
    const serviceError = normalizeRedesignError(error);
    console.error("Unexpected redesign error", error);
    c.header("Retry-After", "5");
    return c.json(
      { error: { message: serviceError.message, code: serviceError.code } },
      serviceError.retryable ? 503 : 422
    );
  }
});

export { redesignRouter };
