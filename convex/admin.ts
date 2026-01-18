import { action, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateRecipe as generateRecipeAI, capitalizeElementName } from "./ai";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to check if user is admin (for use in queries/mutations)
async function assertAdmin(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const adminEntry = await ctx.db
    .query("adminUsers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!adminEntry) {
    throw new Error("Not authorized");
  }
}

// Internal query for actions to check admin status
export const checkIsAdmin = internalQuery({
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

// Helper for actions to assert admin
async function assertAdminAction(ctx: { runQuery: any }) {
  const isAdmin = await ctx.runQuery(internal.admin.checkIsAdmin);
  if (!isAdmin) {
    throw new Error("Not authorized");
  }
}

// ============== ELEMENT FUNCTIONS ==============

export const addElement = action({
  args: {
    name: v.string(),
    SVG: v.string(),
  },
  handler: async (ctx, args): Promise<{ id: string; name: string }> => {
    await assertAdminAction(ctx);
    // Capitalize each word in the name
    const trimmedName = args.name.trim();
    const capitalizedName = trimmedName
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Check if element with this name already exists
    const existing = await ctx.runQuery(internal.elements.findByName, {
      name: capitalizedName,
    });

    if (existing) {
      return { id: existing._id, name: existing.name };
    }

    let svg = args.SVG;

    // If SVG is empty, generate one using the AI action
    if (!svg || svg.trim() === "") {
      svg = await ctx.runAction(internal.ai.generateSVG, {
        elementName: capitalizedName,
      });
    }

    const elementId: string = await ctx.runMutation(internal.elements.insertElement, {
      name: capitalizedName,
      SVG: svg,
    });

    return { id: elementId, name: capitalizedName };
  },
});

export const getElement = query({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.get(args.elementId);
  },
});

export const updateElement = mutation({
  args: {
    elementId: v.id("elements"),
    name: v.string(),
    SVG: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // Capitalize each word in the name
    const trimmedName = args.name.trim();
    const capitalizedName = trimmedName
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    await ctx.db.patch(args.elementId, {
      name: capitalizedName,
      SVG: args.SVG.trim(),
    });
  },
});

export const regenerateSVG = action({
  args: {
    elementId: v.id("elements"),
    feedback: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    await assertAdminAction(ctx);
    // Get the element
    const element = await ctx.runQuery(internal.elements.getElement, {
      elementId: args.elementId,
    });

    if (!element) {
      throw new Error("Element not found");
    }

    // Generate new SVG with feedback
    const newSVG: string = await ctx.runAction(internal.ai.regenerateSVG, {
      elementName: element.name,
      oldSVG: element.SVG,
      feedback: args.feedback,
    });

    // Update the element with the new SVG
    await ctx.runMutation(internal.elements.updateElementSVG, {
      elementId: args.elementId,
      SVG: newSVG,
    });

    return newSVG;
  },
});

export const deleteElement = mutation({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // Delete all recipes that reference this element
    const recipesAsIngredient1 = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("ingredient1"), args.elementId))
      .collect();
    const recipesAsIngredient2 = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("ingredient2"), args.elementId))
      .collect();
    const recipesAsResult = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("result"), args.elementId))
      .collect();

    // Delete all found recipes
    for (const recipe of recipesAsIngredient1) {
      await ctx.db.delete(recipe._id);
    }
    for (const recipe of recipesAsIngredient2) {
      await ctx.db.delete(recipe._id);
    }
    for (const recipe of recipesAsResult) {
      await ctx.db.delete(recipe._id);
    }

    // Delete all unlockedElements referencing this element
    const unlockedElements = await ctx.db
      .query("unlockedElements")
      .filter((q) => q.eq(q.field("elementId"), args.elementId))
      .collect();
    for (const unlocked of unlockedElements) {
      await ctx.db.delete(unlocked._id);
    }

    // Delete the element itself
    await ctx.db.delete(args.elementId);
  },
});

// ============== RECIPE FUNCTIONS ==============

export const findCombination = query({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const recipes = await ctx.db
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
      .collect();

    return recipes.map((recipe) => recipe.result);
  },
});

export const listRecipes = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db
      .query("recipes")
      .order("desc")
      .collect();
  },
});

export const getRecipesForElement = query({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("result"), args.elementId))
      .collect();
  },
});

export const getRecipesUsingElement = query({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const asIngredient1 = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("ingredient1"), args.elementId))
      .collect();
    const asIngredient2 = await ctx.db
      .query("recipes")
      .filter((q) => q.eq(q.field("ingredient2"), args.elementId))
      .collect();
    return [...asIngredient1, ...asIngredient2];
  },
});

export const addRecipe = mutation({
  args: {
    ingredient1: v.id("elements"),
    ingredient2: v.id("elements"),
    result: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // Check if a recipe with the same ingredients (in any order) and result already exists
    const existingRecipe1 = await ctx.db
      .query("recipes")
      .filter((q) =>
        q.and(
          q.eq(q.field("ingredient1"), args.ingredient1),
          q.eq(q.field("ingredient2"), args.ingredient2),
          q.eq(q.field("result"), args.result)
        )
      )
      .first();

    const existingRecipe2 = await ctx.db
      .query("recipes")
      .filter((q) =>
        q.and(
          q.eq(q.field("ingredient1"), args.ingredient2),
          q.eq(q.field("ingredient2"), args.ingredient1),
          q.eq(q.field("result"), args.result)
        )
      )
      .first();

    if (existingRecipe1 || existingRecipe2) {
      throw new Error("A recipe with these ingredients and result already exists");
    }

    const recipeId = await ctx.db.insert("recipes", {
      ingredient1: args.ingredient1,
      ingredient2: args.ingredient2,
      result: args.result,
    });
    return recipeId;
  },
});

export const deleteRecipe = mutation({
  args: {
    recipeId: v.id("recipes"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.recipeId);
  },
});

export const getRecipe = query({
  args: {
    recipeId: v.id("recipes"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.get(args.recipeId);
  },
});

export const updateRecipe = mutation({
  args: {
    recipeId: v.id("recipes"),
    ingredient1: v.id("elements"),
    ingredient2: v.id("elements"),
    result: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.recipeId, {
      ingredient1: args.ingredient1,
      ingredient2: args.ingredient2,
      result: args.result,
    });
  },
});

export const generateRecipe = action({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args) => {
    await assertAdminAction(ctx);
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

    let resultElementId: string;

    if (existingElement) {
      resultElementId = existingElement._id;
    } else {
      // Create new element (no discoveredBy for admin-generated recipes)
      const svg = await ctx.runAction(internal.ai.generateSVG, {
        elementName: resultName,
      });
      resultElementId = await ctx.runMutation(internal.elements.insertElement, {
        name: resultName,
        SVG: svg,
      });
    }

    // Create the recipe
    await ctx.runMutation(internal.recipes.insertRecipe, {
      ingredient1: args.element1,
      ingredient2: args.element2,
      result: resultElementId as any,
    });

    return resultElementId;
  },
});
