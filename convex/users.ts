import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
  },
});
