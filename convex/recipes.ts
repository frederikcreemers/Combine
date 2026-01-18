import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
