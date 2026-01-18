import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateRecipe as generateRecipeAI } from "./ai";

export const findCombination = query({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args) => {
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
    return await ctx.db
      .query("recipes")
      .order("desc")
      .collect();
  },
});

export const listRecipesForGeneration = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("recipes").collect();
  },
});

export const insertRecipe = internalMutation({
  args: {
    ingredient1: v.id("elements"),
    ingredient2: v.id("elements"),
    result: v.id("elements"),
  },
  handler: async (ctx, args) => {
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

export const getRecipesForElement = query({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
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
    await ctx.db.delete(args.recipeId);
  },
});

export const generateRecipe = action({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args) => {
    // Get all recipes for context
    const allRecipes = await ctx.runQuery(internal.recipes.listRecipesForGeneration);
    const element1 = await ctx.runQuery(internal.elements.getElementPublic, {
      elementId: args.element1,
    });
    const element2 = await ctx.runQuery(internal.elements.getElementPublic, {
      elementId: args.element2,
    });

    if (!element1 || !element2) {
      throw new Error("One or both elements not found");
    }

    // Build examples from existing recipes
    const recipeExamples = await Promise.all(
      allRecipes.map(async (recipe) => {
        const ing1 = await ctx.runQuery(internal.elements.getElementPublic, {
          elementId: recipe.ingredient1,
        });
        const ing2 = await ctx.runQuery(internal.elements.getElementPublic, {
          elementId: recipe.ingredient2,
        });
        const res = await ctx.runQuery(internal.elements.getElementPublic, {
          elementId: recipe.result,
        });
        if (ing1 && ing2 && res) {
          return `${ing1.name} + ${ing2.name} = ${res.name}`;
        }
        return null;
      })
    );
    const recipeExamplesText = recipeExamples.filter((r) => r !== null).join("\n");

    const result = await generateRecipeAI(element1.name, element2.name, recipeExamplesText);

    let resultName = result.trim();

    if (resultName.toUpperCase() === "NO RESULT") {
      return null;
    }

    // Capitalize each word in the name
    resultName = resultName
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Check if element exists
    const existingElement = await ctx.runQuery(internal.elements.getElementByName, {
      name: resultName,
    });

    let resultElementId: string;

    if (existingElement) {
      resultElementId = existingElement._id;
    } else {
      // Create new element
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
