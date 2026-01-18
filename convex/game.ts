import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listUnlockedElements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    const unlockedElements = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const elements = await Promise.all(
      unlockedElements.map(async (unlocked) => {
        const element = await ctx.db.get(unlocked.elementId);
        if (!element) return null;
        return {
          _id: element._id,
          name: element.name,
          SVG: element.SVG,
        };
      })
    );

    return elements.filter((el) => el !== null);
  },
});

export const unlockInitialElements = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // Check if user already has any unlocked elements
    const existingUnlocked = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingUnlocked) {
      return;
    }

    // Find initial elements by name
    const initialElementNames = ["Earth", "Air", "Water", "Fire", "Time"];

    for (const name of initialElementNames) {
      const element = await ctx.db
        .query("elements")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();

      if (element) {
        await ctx.db.insert("unlockedElements", {
          elementId: element._id,
          userId,
        });
      }
    }
  },
});
