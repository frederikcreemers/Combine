import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DELETE_BATCH_SIZE = 100;
const MAX_DELETES_PER_RUN = 500;

export const insert = internalMutation({
  args: {
    description: v.string(),
    models: v.array(
      v.object({
        model: v.string(),
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
        cost: v.number(),
        calls: v.number(),
      })
    ),
    totalTokens: v.number(),
    totalCost: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("ai_cost_logs", args);
  },
});

// Deletes oldest cost logs older than one week, in batches.
export const deleteOldLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ONE_WEEK_MS;
    let deleted = 0;

    while (deleted < MAX_DELETES_PER_RUN) {
      const batch = await ctx.db
        .query("ai_cost_logs")
        .order("asc")
        .take(DELETE_BATCH_SIZE);
      if (batch.length === 0) break;

      let reachedRecent = false;
      for (const log of batch) {
        if (log._creationTime >= cutoff) {
          reachedRecent = true;
          break;
        }
        await ctx.db.delete(log._id);
        deleted++;
        if (deleted >= MAX_DELETES_PER_RUN) break;
      }
      if (reachedRecent) break;
      // If the whole batch was old and we still have budget, keep going
      if (batch.length < DELETE_BATCH_SIZE) break;
    }

    return { deleted };
  },
});
