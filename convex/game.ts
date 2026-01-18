import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateRecipe as generateRecipeAI, capitalizeElementName } from "./ai";
import { rateLimiter } from "./rateLimits";
import type { Id } from "./_generated/dataModel";

export const listDiscoveredElements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const elements = await ctx.db
      .query("elements")
      .withIndex("by_discoveredBy", (q) => q.eq("discoveredBy", userId))
      .collect();

    return elements.map((el) => ({
      _id: el._id,
      name: el.name,
      SVG: el.SVG,
    }));
  },
});

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

const INITIAL_ELEMENT_NAMES = ["Earth", "Air", "Water", "Fire", "Time"];

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
    for (const name of INITIAL_ELEMENT_NAMES) {
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

export const clearProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // Get IDs of initial elements to keep
    const initialElementIds = new Set<Id<"elements">>();
    for (const name of INITIAL_ELEMENT_NAMES) {
      const element = await ctx.db
        .query("elements")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (element) {
        initialElementIds.add(element._id);
      }
    }

    // Get all unlocked elements for this user
    const unlockedElements = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Delete all except initial elements
    for (const unlocked of unlockedElements) {
      if (!initialElementIds.has(unlocked.elementId)) {
        await ctx.db.delete(unlocked._id);
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

export const isElementUnlocked = internalQuery({
  args: {
    elementId: v.id("elements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("unlockedElements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("elementId"), args.elementId))
      .first();
    return !!existing;
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

export const discover = internalAction({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ element: { _id: string; name: string; SVG: string }; elementDiscovered: boolean } | null> => {
    const element1 = await ctx.runQuery(internal.elements.getElementPublic, {
      elementId: args.element1,
    });
    const element2 = await ctx.runQuery(internal.elements.getElementPublic, {
      elementId: args.element2,
    });

    if (!element1 || !element2) {
      throw new Error("One or both elements not found");
    }

    const recipeExamplesText = await ctx.runQuery(internal.recipes.getRecipeExamplesText, {
      element1: args.element1,
      element2: args.element2,
    });
    const result = await generateRecipeAI(element1.name, element2.name, recipeExamplesText);

    let resultName = result.trim();

    if (resultName.toUpperCase() === "NO RESULT") {
      return null;
    }

    resultName = capitalizeElementName(resultName);

    // Check if element exists
    const existingElement = await ctx.runQuery(internal.elements.getElementByName, {
      name: resultName,
    });

    let resultElementId: Id<"elements">;
    let resultSVG: string;
    let elementDiscovered = false;

    if (existingElement) {
      resultElementId = existingElement._id;
      resultSVG = existingElement.SVG;
    } else {
      // Create new element with discoveredBy set to current user
      const svg = await ctx.runAction(internal.ai.generateSVG, {
        elementName: resultName,
      });
      resultElementId = await ctx.runMutation(internal.elements.insertElement, {
        name: resultName,
        SVG: svg,
        discoveredBy: args.userId,
      }) as Id<"elements">;
      resultSVG = svg;
      elementDiscovered = true;
    }

    // Create the recipe
    await ctx.runMutation(internal.recipes.insertRecipe, {
      ingredient1: args.element1,
      ingredient2: args.element2,
      result: resultElementId,
    });

    // Unlock the element for the user if they don't already have it
    const alreadyUnlocked = await ctx.runQuery(internal.game.isElementUnlocked, {
      elementId: resultElementId,
      userId: args.userId,
    });

    if (!alreadyUnlocked) {
      await ctx.runMutation(internal.game.unlockElement, {
        elementId: resultElementId,
        userId: args.userId,
      });
    }

    return {
      element: {
        _id: resultElementId,
        name: resultName,
        SVG: resultSVG,
      },
      elementDiscovered,
    };
  },
});

type CombineResult = 
  | { element: { _id: string; name: string; SVG: string }; new: boolean; recipeDiscovered: boolean; elementDiscovered: boolean; requiresLogin?: false; rateLimitExceeded?: false }
  | { requiresLogin: true }
  | { rateLimitExceeded: true }
  | null;

export const isUserAnonymous = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return true;
    return !user.email;
  },
});

export const combine = action({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args): Promise<CombineResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    const result = await ctx.runQuery(internal.game.findRecipeResult, {
      element1: args.element1,
      element2: args.element2,
      userId,
    });

    if (result) {
      // Recipe exists
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
        recipeDiscovered: false,
        elementDiscovered: false,
      };
    }

    // No recipe exists - check if user is anonymous
    const isAnonymous = await ctx.runQuery(internal.game.isUserAnonymous, {
      userId,
    });

    if (isAnonymous) {
      return { requiresLogin: true };
    }

    // Check rate limit before generating new recipe
    const rateLimitStatus = await rateLimiter.limit(ctx, "newElements", {
      key: userId,
    });

    if (!rateLimitStatus.ok && !(await ctx.runQuery(api.users.isAdmin)))   {
      return { rateLimitExceeded: true };
    }

    // Try to discover one
    const discoverResult = await ctx.runAction(internal.game.discover, {
      element1: args.element1,
      element2: args.element2,
      userId,
    });

    if (!discoverResult) {
      return null;
    }

    return {
      element: discoverResult.element,
      new: true,
      recipeDiscovered: true,
      elementDiscovered: discoverResult.elementDiscovered,
    };
  },
});
