import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction, query } from "./_generated/server";
import { generationTracer, TRACE_RETENTION_MINUTES } from "./tracer";

async function assertAdmin(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const adminEntry = await ctx.db
    .query("adminUsers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!adminEntry) throw new Error("Not authorized");
}

export const listGenerationTraces = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertAdmin(ctx);
    return await generationTracer.tracer.listTraces(ctx, {
      limit: Math.min(Math.max(limit ?? 100, 1), 250),
    });
  },
});

export const getGenerationTrace = query({
  args: { traceId: v.string() },
  handler: async (ctx, { traceId }) => {
    await assertAdmin(ctx);
    return await generationTracer.tracer.getTrace(ctx, traceId);
  },
});

export const deleteOldGenerationTraces = internalAction({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TRACE_RETENTION_MINUTES * 60 * 1000;
    const traces = await generationTracer.tracer.listTraces(ctx, {});
    const expired = traces.filter((trace) => trace._creationTime < cutoff);

    // Marking a trace as discarded makes the component's cleanup mutation
    // remove the trace together with all of its spans and logs.
    for (const trace of expired) {
      await ctx.runMutation(components.tracer.lib.updateTracePreserve, {
        traceId: trace._id,
        preserve: false,
      });
      await ctx.runMutation(components.tracer.lib.cleanupTrace, {
        traceId: trace._id,
      });
    }

    return expired.length;
  },
});
