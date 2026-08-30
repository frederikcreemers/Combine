import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const ANONYMOUS_USER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_PAGE_SIZE = 20;

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const adminEntry = await ctx.db
      .query("adminUsers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return !!adminEntry;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Check if user has an email (non-anonymous)
    if (user.email) {
      return { id: userId, anonymous: false, email: user.email };
    }

    return { id: userId, anonymous: true };
  },
});

export const linkAccount = mutation({
  args: {
    anonymousUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("User is not authenticated");
    }

    // Don't link to yourself
    if (currentUserId === args.anonymousUserId) {
      return;
    }

    // Get all unlocked elements for the anonymous user
    const anonymousUnlocked = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", args.anonymousUserId))
      .collect();

    // Get current user's unlocked elements
    const currentUnlocked = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .collect();

    const currentUnlockedElementIds = new Set(
      currentUnlocked.map((u) => u.elementId)
    );

    // Transfer elements from anonymous to current user
    for (const unlocked of anonymousUnlocked) {
      // If current user doesn't have this element, unlock it
      if (!currentUnlockedElementIds.has(unlocked.elementId)) {
        await ctx.db.insert("unlockedElements", {
          elementId: unlocked.elementId,
          userId: currentUserId,
        });
      }

      // Remove from anonymous account
      await ctx.db.delete(unlocked._id);
    }

    // Transfer discoveredBy attribution from anonymous to current user
    const discoveredElements = await ctx.db
      .query("elements")
      .withIndex("by_discoveredBy", (q) => q.eq("discoveredBy", args.anonymousUserId))
      .collect();

    for (const element of discoveredElements) {
      await ctx.db.patch(element._id, {
        discoveredBy: currentUserId,
      });
    }
  },
});

export const cleanupInactiveAnonymousUsers = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    cutoff: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - ANONYMOUS_USER_RETENTION_MS;
    const page = await ctx.db
      .query("users")
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: CLEANUP_PAGE_SIZE,
      });

    let deleted = 0;

    for (const user of page.page) {
      if (
        user.isAnonymous !== true ||
        user._creationTime >= cutoff
      ) {
        continue;
      }

      const latestUnlock = await ctx.db
        .query("unlockedElements")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .first();

      if (latestUnlock && latestUnlock._creationTime >= cutoff) {
        continue;
      }

      const [
        unlockedEntries,
        energyEntries,
        adminEntries,
        discoveredElements,
        sessions,
        accounts,
        verifiers,
      ] = await Promise.all([
        ctx.db
          .query("unlockedElements")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("userEnergy")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("adminUsers")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("elements")
          .withIndex("by_discoveredBy", (q) => q.eq("discoveredBy", user._id))
          .collect(),
        ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db.query("authVerifiers").collect(),
      ]);

      for (const account of accounts) {
        const verificationCodes = await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", account._id))
          .collect();
        for (const code of verificationCodes) await ctx.db.delete(code._id);
        await ctx.db.delete(account._id);
      }

      for (const session of sessions) {
        const refreshTokens = await ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const token of refreshTokens) await ctx.db.delete(token._id);

        for (const verifier of verifiers) {
          if (verifier.sessionId === session._id) await ctx.db.delete(verifier._id);
        }
        await ctx.db.delete(session._id);
      }

      for (const entry of unlockedEntries) await ctx.db.delete(entry._id);
      for (const entry of energyEntries) await ctx.db.delete(entry._id);
      for (const entry of adminEntries) await ctx.db.delete(entry._id);
      for (const element of discoveredElements) {
        await ctx.db.patch(element._id, { discoveredBy: undefined });
      }

      await ctx.db.delete(user._id);
      deleted += 1;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.users.cleanupInactiveAnonymousUsers,
        { cursor: page.continueCursor, cutoff },
      );
    }

    return { deleted, complete: page.isDone };
  },
});
