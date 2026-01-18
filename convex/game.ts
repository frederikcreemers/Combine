import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

export const findRecipeResult = internalQuery({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find recipe with these ingredients (check both orderings)
    const recipe = await ctx.db
      .query("recipes")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("ingredient1"), args.element1),
            q.eq(q.field("ingredient2"), args.element2)
          ),
          q.and(
            q.eq(q.field("ingredient1"), args.element2),
            q.eq(q.field("ingredient2"), args.element1)
          )
        )
      )
      .first();

    if (!recipe) {
      return null;
    }

    // Get the result element
    const resultElement = await ctx.db.get(recipe.result);
    if (!resultElement) {
      return null;
    }

    // Check if user already has this element unlocked
    const existingUnlock = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("elementId"), recipe.result))
      .first();

    return {
      element: {
        _id: resultElement._id,
        name: resultElement.name,
        SVG: resultElement.SVG,
      },
      alreadyUnlocked: !!existingUnlock,
    };
  },
});

export const unlockElement = internalMutation({
  args: {
    elementId: v.id("elements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("unlockedElements", {
      elementId: args.elementId,
      userId: args.userId,
    });
  },
});

export const combine = action({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args): Promise<{ element: { _id: string; name: string; SVG: string }; new: boolean } | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    const result = await ctx.runQuery(internal.game.findRecipeResult, {
      element1: args.element1,
      element2: args.element2,
      userId,
    });

    if (!result) {
      return null;
    }

    const isNew = !result.alreadyUnlocked;

    if (isNew) {
      await ctx.runMutation(internal.game.unlockElement, {
        elementId: result.element._id,
        userId,
      });
    }

    return {
      element: result.element,
      new: isNew,
    };
  },
});
