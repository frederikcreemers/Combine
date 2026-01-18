import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listRecipesForGeneration = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("recipes").collect();
  },
});

export const getRecipeExamplesText = internalQuery({
  args: {},
  handler: async (ctx): Promise<string> => {
    const allRecipes = await ctx.db.query("recipes").collect();
    
    const examples = await Promise.all(
      allRecipes.map(async (recipe) => {
        const ing1 = await ctx.db.get(recipe.ingredient1);
        const ing2 = await ctx.db.get(recipe.ingredient2);
        const res = await ctx.db.get(recipe.result);
        if (ing1 && ing2 && res) {
          return `${ing1.name} + ${ing2.name} = ${res.name}`;
        }
        return null;
      })
    );
    
    return examples.filter((r): r is string => r !== null).join("\n");
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
