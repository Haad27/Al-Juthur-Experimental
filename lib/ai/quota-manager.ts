import prisma from '@/lib/prisma'; // Assuming there is a prisma client export
import { TokenUsage, estimateTokens } from './token-budget';

// Daily user limit
export const DAILY_TOKEN_LIMIT_PER_IP = 250000; // Increased for testing

export async function checkUserQuota(identifier: string, estimatedTokens: number): Promise<{ allowed: boolean, remaining: number }> {
  const now = new Date();
  
  let user = await prisma.userUsage.findUnique({
    where: { identifier }
  });

  if (!user) {
    user = await prisma.userUsage.create({
      data: { identifier, dailyTokensConsumed: 0, lastResetDate: now }
    });
  }

  // Reset if it's been more than 24 hours
  const hoursSinceReset = (now.getTime() - user.lastResetDate.getTime()) / (1000 * 60 * 60);
  if (hoursSinceReset >= 24) {
    user = await prisma.userUsage.update({
      where: { identifier },
      data: { dailyTokensConsumed: 0, lastResetDate: now }
    });
  }

  const remaining = Math.max(0, DAILY_TOKEN_LIMIT_PER_IP - user.dailyTokensConsumed);
  
  return {
    allowed: remaining >= estimatedTokens,
    remaining
  };
}

export async function checkModelCapacity(modelName: string, estimatedTokens: number, maxRpm: number, maxWeeklyTokens: number): Promise<boolean> {
  const now = new Date();

  let modelUsage = await prisma.modelUsage.findUnique({
    where: { modelName }
  });

  if (!modelUsage) {
    modelUsage = await prisma.modelUsage.create({
      data: { modelName, rpmCount: 0, weeklyTokensConsumed: 0, rpmLastReset: now, weeklyLastReset: now }
    });
  }

  let rpmCount = modelUsage.rpmCount;
  let weeklyTokensConsumed = modelUsage.weeklyTokensConsumed;

  // Reset RPM bucket if 60 seconds have passed
  const secondsSinceRpmReset = (now.getTime() - modelUsage.rpmLastReset.getTime()) / 1000;
  if (secondsSinceRpmReset >= 60) {
    rpmCount = 0;
  }

  // Reset Weekly bucket if 7 days have passed
  const daysSinceWeeklyReset = (now.getTime() - modelUsage.weeklyLastReset.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceWeeklyReset >= 7) {
    weeklyTokensConsumed = 0;
  }

  if (rpmCount >= maxRpm || (weeklyTokensConsumed + estimatedTokens) > maxWeeklyTokens) {
    return false;
  }

  // Optimistically increment RPM count immediately so parallel requests don't blow past the limit
  await prisma.modelUsage.update({
    where: { modelName },
    data: {
      rpmCount: rpmCount + 1,
      rpmLastReset: rpmCount === 0 ? now : modelUsage.rpmLastReset,
      weeklyTokensConsumed,
      weeklyLastReset: weeklyTokensConsumed === 0 ? now : modelUsage.weeklyLastReset
    }
  });

  return true;
}

export async function logUsage(identifier: string, modelName: string, actualUsage: TokenUsage) {
  // 1. Deduct from User
  await prisma.userUsage.update({
    where: { identifier },
    data: {
      dailyTokensConsumed: { increment: actualUsage.creditsConsumed }
    }
  }).catch(() => {}); // ignore if user doesn't exist for some reason

  // 2. Deduct from Model Weekly Tracker
  await prisma.modelUsage.update({
    where: { modelName },
    data: {
      weeklyTokensConsumed: { increment: actualUsage.totalTokens }
    }
  }).catch(() => {});
}
