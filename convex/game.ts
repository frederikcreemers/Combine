import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateRecipe as generateRecipeAI, generateElementDescription, capitalizeElementName } from "./ai";
import {
  ENERGY_COST_EXISTING_ELEMENT,
  ENERGY_COST_NEW_ELEMENT,
} from "./energy";
import type { Id } from "./_generated/dataModel";
import { storeSvg, withSvgUrl } from "./elements";
import {
  currentTraceContext,
  internalTracedAction,
  type TracedResult,
  unwrapTracedResult,
} from "./tracer";

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

export const generateElementDetails = internalTracedAction({
  name: "generateElementDetails",
  args: {
    elementId: v.id("elements"),
    elementName: v.string(),
    expectedStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.tracer.updateMetadata({
      elementId: args.elementId,
      elementName: args.elementName,
      phase: "element-details",
    });

    try {
      const [svg, description] = await Promise.all([
        ctx.tracer.withSpan("generate SVG", async (span) => {
          await span.updateMetadata({ elementName: args.elementName });
          return await ctx.runAction(internal.ai.generateSVG, {
            elementName: args.elementName,
          });
        }),
        ctx.tracer.withSpan("generate description", async (span) => {
          await span.updateMetadata({ elementName: args.elementName });
          try {
            return await generateElementDescription(ctx, args.elementName);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await span.warn("Description generation failed", { error: message });
            console.error(
              `Failed to generate description for ${args.elementName}:`,
              error,
            );
            return undefined;
          }
        }),
      ]);
      const svgStorageId = await ctx.tracer.withSpan("optimize and store SVG", async () => {
        return await storeSvg(ctx, svg);
      });
      await ctx.tracer.withSpan("complete element generation", async () => {
        await ctx.runMutation(internal.game.completeElementGeneration, {
          elementId: args.elementId,
          expectedStorageId: args.expectedStorageId,
          svgStorageId,
          description,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.tracer.error("Element generation failed", { error: message });
      console.error(
        `Failed to generate details for ${args.elementName}:`,
        error,
      );
      await ctx.tracer.withSpan("mark element generation failed", async () => {
        await ctx.runMutation(internal.game.failElementGeneration, {
          elementId: args.elementId,
          expectedStorageId: args.expectedStorageId,
        });
      });
    }
  },
});

export const discover = internalTracedAction({
  name: "discoverRecipe",
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ element: ElementResult; elementDiscovered: boolean }> => {
    const [element1, element2] = await ctx.tracer.withSpan("load ingredients", async () => {
      return await Promise.all([
        ctx.runQuery(internal.elements.getElementPublic, {
          elementId: args.element1,
        }),
        ctx.runQuery(internal.elements.getElementPublic, {
          elementId: args.element2,
        }),
      ]);
    });

    if (!element1 || !element2) {
      throw new Error("One or both elements not found");
    }

    await ctx.tracer.updateMetadata({
      ingredient1: element1.name,
      ingredient2: element2.name,
      phase: "recipe-discovery",
    });
    await ctx.runMutation(components.tracer.lib.updateTraceMetadata, {
      traceId: ctx.tracer.getTraceId(),
      metadata: {
        ingredient1: element1.name,
        ingredient2: element2.name,
      },
    });

    const [recipeExamplesText, existingElements] = await ctx.tracer.withSpan(
      "load recipe context",
      async () => {
        return await Promise.all([
          ctx.runQuery(internal.recipes.getRecipeExamplesText, {
            element1: args.element1,
            element2: args.element2,
          }),
          ctx.runQuery(internal.elements.listElementNames, {}),
        ]);
      },
    );
    const result = await ctx.tracer.withSpan("generate recipe", async (span) => {
      const generated = await generateRecipeAI(
        ctx,
        element1.name,
        element2.name,
        recipeExamplesText,
        existingElements,
      );
      await span.updateMetadata({ result: generated });
      return generated;
    });

    const resultName = capitalizeElementName(result.trim());

    // Check if element exists
    const existingElement = await ctx.tracer.withSpan("find result element", async () => {
      return await ctx.runQuery(internal.elements.getElementByName, {
        name: resultName,
      });
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
      const created = await ctx.tracer.withSpan("create pending element", async () => {
        const svgStorageId = await storeSvg(ctx, PENDING_ELEMENT_SVG);
        const elementId = await ctx.runMutation(internal.elements.insertElement, {
          name: resultName,
          svgStorageId,
          discoveredBy: args.userId,
          generationStatus: "pending",
        }) as Id<"elements">;
        const svgUrl = await ctx.storage.getUrl(svgStorageId);
        if (!svgUrl) {
          throw new Error(`Could not resolve stored SVG for element ${elementId}`);
        }
        return { elementId, svgStorageId, svgUrl };
      });
      resultElementId = created.elementId;
      resultElement = {
        _id: created.elementId,
        name: resultName,
        svgUrl: created.svgUrl,
        generationStatus: "pending",
      };
      elementDiscovered = true;
      pendingGeneration = {
        elementId: created.elementId,
        elementName: resultName,
        expectedStorageId: created.svgStorageId,
      };
    }

    await ctx.tracer.withSpan("save recipe and unlock result", async () => {
      await ctx.runMutation(internal.recipes.insertRecipe, {
        ingredient1: args.element1,
        ingredient2: args.element2,
        result: resultElementId,
      });

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
    });

    if (pendingGeneration) {
      await ctx.tracer.withSpan("schedule element details", async () => {
        await ctx.scheduler.runAfter(
          0,
          internal.game.generateElementDetails,
          {
            ...pendingGeneration,
            __traceContext: currentTraceContext(ctx),
          },
        );
      });
    }

    await ctx.runMutation(components.tracer.lib.updateTraceMetadata, {
      traceId: ctx.tracer.getTraceId(),
      metadata: {
        result: resultName,
        elementDiscovered,
      },
    });

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

export const combineTraced = internalTracedAction({
  name: "combineElements",
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
    const discoverResult = unwrapTracedResult<{
      element: ElementResult;
      elementDiscovered: boolean;
    }>(
      await ctx.runTracedAction(internal.game.discover, {
        element1: args.element1,
        element2: args.element2,
        userId,
      }) as TracedResult<{
        element: ElementResult;
        elementDiscovered: boolean;
      }>,
    );

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

export const combine = action({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args): Promise<CombineResult> => {
    return unwrapTracedResult(
      await ctx.runAction(internal.game.combineTraced, {
        ...args,
        __traceContext: undefined,
      }) as TracedResult<CombineResult>,
    );
  },
});
