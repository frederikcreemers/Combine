import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const MAX_ENERGY = 30;
export const ENERGY_COST_EXISTING_ELEMENT = 1;
export const ENERGY_COST_NEW_ELEMENT = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getMidnightUTC(now = Date.now()): number {
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight.getTime();
}

async function getOrResetEnergyRecord(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<{ energy: number; dayStart: number; id: Id<"userEnergy"> }> {
  const dayStart = getMidnightUTC();
  const existing = await ctx.db
    .query("userEnergy")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!existing) {
    const id = await ctx.db.insert("userEnergy", {
      userId,
      energy: MAX_ENERGY,
      dayStart,
    });
    return { id, energy: MAX_ENERGY, dayStart };
  }

  if (existing.dayStart < dayStart) {
    await ctx.db.patch(existing._id, {
      energy: MAX_ENERGY,
      dayStart,
    });
    return { id: existing._id, energy: MAX_ENERGY, dayStart };
  }

  return {
    id: existing._id,
    energy: existing.energy,
    dayStart: existing.dayStart,
  };
}

export const getEnergy = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        energy: MAX_ENERGY,
        maxEnergy: MAX_ENERGY,
        resetsAt: getMidnightUTC() + DAY_MS,
      };
    }

    const dayStart = getMidnightUTC();
    const existing = await ctx.db
      .query("userEnergy")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const energy =
      !existing || existing.dayStart < dayStart
        ? MAX_ENERGY
        : existing.energy;

    return {
      energy,
      maxEnergy: MAX_ENERGY,
      resetsAt: dayStart + DAY_MS,
    };
  },
});

// Ensures the user's daily energy is initialized/reset, then returns the balance.
export const getOrResetEnergy = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const record = await getOrResetEnergyRecord(ctx, args.userId);
    return {
      energy: record.energy,
      maxEnergy: MAX_ENERGY,
    };
  },
});

// Deducts energy for a discovery. Never goes below 0.
export const consumeEnergy = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      const record = await getOrResetEnergyRecord(ctx, args.userId);
      return { energy: record.energy, spent: 0 };
    }

    const record = await getOrResetEnergyRecord(ctx, args.userId);
    const spent = Math.min(record.energy, args.amount);
    const energy = record.energy - spent;
    await ctx.db.patch(record.id, { energy });
    return { energy, spent };
  },
});
