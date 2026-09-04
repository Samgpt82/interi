import { env } from "../env";

const REVENUECAT_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1_000;
const accessCache = new Map<string, { expiresAt: number }>();
let warnedAboutDevelopmentFallback = false;

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null }>;
    subscriptions?: Record<string, { expires_date?: string | null }>;
  };
}

export class SubscriptionNotActiveError extends Error {
  constructor() {
    super("An active membership is required to create more designs.");
    this.name = "SubscriptionNotActiveError";
  }
}

export class SubscriptionVerificationError extends Error {
  constructor(message = "Unable to verify your membership right now. Please try again.") {
    super(message);
    this.name = "SubscriptionVerificationError";
  }
}

function isCurrent(expiresAt: string | null | undefined): boolean {
  if (expiresAt === null) return true;
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function cacheActiveAccess(userId: string): void {
  const now = Date.now();
  for (const [cachedUserId, entry] of accessCache) {
    if (entry.expiresAt <= now) accessCache.delete(cachedUserId);
  }
  if (accessCache.size >= MAX_CACHE_ENTRIES) {
    const oldestUserId = accessCache.keys().next().value as string | undefined;
    if (oldestUserId) accessCache.delete(oldestUserId);
  }
  accessCache.set(userId, { expiresAt: now + CACHE_TTL_MS });
}

function hasActiveAccess(payload: RevenueCatSubscriberResponse): boolean {
  const subscriber = payload.subscriber;
  if (!subscriber) return false;

  if (env.REVENUECAT_ENTITLEMENT_ID) {
    return isCurrent(subscriber.entitlements?.[env.REVENUECAT_ENTITLEMENT_ID]?.expires_date);
  }

  return [
    ...Object.values(subscriber.entitlements ?? {}),
    ...Object.values(subscriber.subscriptions ?? {}),
  ].some((entry) => isCurrent(entry.expires_date));
}

export async function assertActiveSubscription(userId: string): Promise<void> {
  if (!env.REVENUECAT_SECRET_API_KEY) {
    if (env.NODE_ENV === "production") {
      throw new SubscriptionVerificationError("Membership verification is not configured.");
    }
    if (!warnedAboutDevelopmentFallback) {
      warnedAboutDevelopmentFallback = true;
      console.warn("RevenueCat server verification is disabled outside production.");
    }
    return;
  }

  const cached = accessCache.get(userId);
  if (cached?.expiresAt && cached.expiresAt > Date.now()) return;
  if (cached) accessCache.delete(userId);

  let response: Response;
  try {
    response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${env.REVENUECAT_SECRET_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(REVENUECAT_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("RevenueCat subscription verification failed", error);
    throw new SubscriptionVerificationError();
  }

  if (response.status === 404) {
    accessCache.set(userId, { active: false, expiresAt: Date.now() + CACHE_TTL_MS });
    throw new SubscriptionNotActiveError();
  }
  if (!response.ok) {
    console.error("RevenueCat subscription verification failed", response.status);
    throw new SubscriptionVerificationError();
  }

  const payload = (await response.json().catch(() => null)) as RevenueCatSubscriberResponse | null;
  if (!payload) throw new SubscriptionVerificationError();

  const active = hasActiveAccess(payload);
  accessCache.set(userId, { active, expiresAt: Date.now() + CACHE_TTL_MS });
  if (!active) throw new SubscriptionNotActiveError();
}
