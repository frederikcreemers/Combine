import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateRecipe as generateRecipeAI, generateElementDescription, capitalizeElementName } from "./ai";
import {
  ENERGY_COST_EXISTING_ELEMENT,
  ENERGY_COST_NEW_ELEMENT,
} from "./energy";
import type { Id } from "./_generated/dataModel";
import { storeSvg, withSvgUrl } from "./elements";

type ElementResult = {
  _id: Id<"elements">;
  name: string;
  description?: string;
  svgUrl: string;
  generationStatus?: "pending" | "complete" | "failed";
};

const PENDING_ELEMENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path fill="#fff" fill-opacity=".15" stroke="#fff" stroke-width="6" stroke-linejoin="round" d="M45 15h30M51 15v32L28 91c-5 8 1 18 10 18h44c9 0 15-10 10-18L69 47V15"/><path fill="#fb7185" fill-opacity=".75" d="M38 84h44l10 17c2 4-1 8-5 8H33c-4 0-7-4-5-8z"/><circle cx="48" cy="91" r="4" fill="#fde047"/><circle cx="68" cy="98" r="5" fill="#f9a8d4"/><circle cx="63" cy="80" r="3" fill="#fdba74"/></svg>`;

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

    return await Promise.all(elements.map((element) => withSvgUrl(ctx, element)));
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
        return await withSvgUrl(ctx, element);
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
      element: await withSvgUrl(ctx, resultElement),
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

export const completeElementGeneration = internalMutation({
  args: {
    elementId: v.id("elements"),
    expectedStorageId: v.id("_storage"),
    svgStorageId: v.id("_storage"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db.get(args.elementId);
    if (
      !element ||
      element.generationStatus !== "pending" ||
      element.svgStorageId !== args.expectedStorageId
    ) {
      await ctx.storage.delete(args.svgStorageId);
      return false;
    }

    await ctx.db.patch(args.elementId, {
      description: args.description,
      svgStorageId: args.svgStorageId,
      generationStatus: "complete",
    });
    await ctx.storage.delete(args.expectedStorageId);
    return true;
  },
});

export const failElementGeneration = internalMutation({
  args: {
    elementId: v.id("elements"),
    expectedStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db.get(args.elementId);
    if (
      element?.generationStatus === "pending" &&
      element.svgStorageId === args.expectedStorageId
    ) {
      await ctx.db.patch(args.elementId, { generationStatus: "failed" });
    }
  },
});

export const generateElementDetails = internalAction({
  args: {
    elementId: v.id("elements"),
    elementName: v.string(),
    expectedStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      const [svg, description] = await Promise.all([
        ctx.runAction(internal.ai.generateSVG, {
          elementName: args.elementName,
        }),
        generateElementDescription(ctx, args.elementName).catch((error) => {
          console.error(
            `Failed to generate description for ${args.elementName}:`,
            error,
          );
          return undefined;
        }),
      ]);
      const svgStorageId = await storeSvg(ctx, svg);
      await ctx.runMutation(internal.game.completeElementGeneration, {
        elementId: args.elementId,
        expectedStorageId: args.expectedStorageId,
        svgStorageId,
        description,
      });
    } catch (error) {
      console.error(
        `Failed to generate details for ${args.elementName}:`,
        error,
      );
      await ctx.runMutation(internal.game.failElementGeneration, {
        elementId: args.elementId,
        expectedStorageId: args.expectedStorageId,
      });
    }
  },
});

export const discover = internalAction({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ element: ElementResult; elementDiscovered: boolean }> => {
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
    const existingElements = await ctx.runQuery(internal.elements.listElementNames, {});
    const result = await generateRecipeAI(ctx, element1.name, element2.name, recipeExamplesText, existingElements);

    const resultName = capitalizeElementName(result.trim());

    // Check if element exists
    const existingElement = await ctx.runQuery(internal.elements.getElementByName, {
      name: resultName,
    });

    let resultElementId: Id<"elements">;
    let resultElement: ElementResult;
    let elementDiscovered = false;
    let pendingGeneration: {
      elementId: Id<"elements">;
      elementName: string;
      expectedStorageId: Id<"_storage">;
    } | null = null;

    if (existingElement) {
      resultElementId = existingElement._id;
      const svgUrl = await ctx.storage.getUrl(existingElement.svgStorageId);
      if (!svgUrl) {
        throw new Error(`SVG file is missing for element ${existingElement._id}`);
      }
      resultElement = {
        _id: existingElement._id,
        name: existingElement.name,
        description: existingElement.description,
        svgUrl,
        generationStatus: existingElement.generationStatus,
      };
    } else {
      // Persist a lightweight placeholder so the discovery can return while the
      // illustration and description are generated by a scheduled action.
      const svgStorageId = await storeSvg(ctx, PENDING_ELEMENT_SVG);
      resultElementId = await ctx.runMutation(internal.elements.insertElement, {
        name: resultName,
        svgStorageId,
        discoveredBy: args.userId,
        generationStatus: "pending",
      }) as Id<"elements">;
      const svgUrl = await ctx.storage.getUrl(svgStorageId);
      if (!svgUrl) {
        throw new Error(`Could not resolve stored SVG for element ${resultElementId}`);
      }
      resultElement = {
        _id: resultElementId,
        name: resultName,
        svgUrl,
        generationStatus: "pending",
      };
      elementDiscovered = true;
      pendingGeneration = {
        elementId: resultElementId,
        elementName: resultName,
        expectedStorageId: svgStorageId,
      };
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

    if (pendingGeneration) {
      await ctx.scheduler.runAfter(
        0,
        internal.game.generateElementDetails,
        pendingGeneration,
      );
    }

    return {
      element: resultElement,
      elementDiscovered,
    };
  },
});

type CombineResult = 
  | { element: ElementResult; new: boolean; recipeDiscovered: boolean; elementDiscovered: boolean }
  | { requiresLogin: true }
  | { rateLimitExceeded: true };

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

    // Energy gate: need at least 1 energy to attempt a discovery.
    // Admins bypass the gate but still spend energy after a successful discovery.
    const energyStatus = await ctx.runMutation(internal.energy.getOrResetEnergy, {
      userId,
    });
    const isAdmin = await ctx.runQuery(api.users.isAdmin);
    if (energyStatus.energy <= 0 && !isAdmin) {
      return { rateLimitExceeded: true };
    }

    // Try to discover one
    const discoverResult = await ctx.runAction(internal.game.discover, {
      element1: args.element1,
      element2: args.element2,
      userId,
    });

    const energyCost = discoverResult.elementDiscovered
      ? ENERGY_COST_NEW_ELEMENT
      : ENERGY_COST_EXISTING_ELEMENT;
    await ctx.runMutation(internal.energy.consumeEnergy, {
      userId,
      amount: energyCost,
    });

    return {
      element: discoverResult.element,
      new: true,
      recipeDiscovered: true,
      elementDiscovered: discoverResult.elementDiscovered,
    };
  },
});
