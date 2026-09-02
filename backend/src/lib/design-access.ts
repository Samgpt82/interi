import { prisma } from "../prisma";
import { FREE_DESIGN_LIMIT, type DesignAccessResponse } from "../types";

export function serializeDesignAccess(freeDesignsUsed: number): DesignAccessResponse {
  const used = Math.min(Math.max(freeDesignsUsed, 0), FREE_DESIGN_LIMIT);
  return {
    freeDesignLimit: FREE_DESIGN_LIMIT,
    freeDesignsUsed: used,
    freeDesignsRemaining: FREE_DESIGN_LIMIT - used,
  };
}

export async function getDesignAccess(userId: string): Promise<DesignAccessResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { freeDesignsUsed: true },
  });
  return serializeDesignAccess(user.freeDesignsUsed);
}

export async function claimFreeDesign(userId: string): Promise<DesignAccessResponse | null> {
  const claimed = await prisma.user.updateMany({
    where: { id: userId, freeDesignsUsed: { lt: FREE_DESIGN_LIMIT } },
    data: { freeDesignsUsed: { increment: 1 } },
  });
  if (claimed.count === 0) return null;
  return getDesignAccess(userId);
}

export async function releaseFreeDesign(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, freeDesignsUsed: { gt: 0 } },
    data: { freeDesignsUsed: { decrement: 1 } },
  });
}
