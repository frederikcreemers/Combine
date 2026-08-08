import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const MIN_EXAMPLES = 30;
const INITIAL_ELEMENT_NAMES = ["Earth", "Air", "Water", "Fire", "Time"];

function unorderedPairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

// Finds combinations players are likely to try early in the game but that have
// no recipe yet. Computes each element's "tier" (the shortest crafting depth
// starting from the initial elements), then returns the unrecipe'd pairs of
// reachable elements with the lowest tiers.
export const getEarlyGameCandidatePairs = internalQuery({
  args: {
    maxPairs: v.number(),
  },
  handler: async (ctx, args) => {
    const allElements = await ctx.db.query("elements").collect();
    const allRecipes = await ctx.db.query("recipes").collect();

    // An element's tier is 0 for initial elements, otherwise
    // min over recipes of (max(tier(ingredient1), tier(ingredient2)) + 1).
    // Iterate to a fixpoint; unreachable elements never get a tier.
    const tierByElementId = new Map<string, number>();
    for (const element of allElements) {
      if (INITIAL_ELEMENT_NAMES.includes(element.name)) {
        tierByElementId.set(element._id, 0);
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const recipe of allRecipes) {
        const tier1 = tierByElementId.get(recipe.ingredient1);
        const tier2 = tierByElementId.get(recipe.ingredient2);
        if (tier1 === undefined || tier2 === undefined) continue;
        const resultTier = Math.max(tier1, tier2) + 1;
        const currentTier = tierByElementId.get(recipe.result);
        if (currentTier === undefined || resultTier < currentTier) {
          tierByElementId.set(recipe.result, resultTier);
          changed = true;
        }
      }
    }

    const pairsWithRecipe = new Set(
      allRecipes.map((recipe) => unorderedPairKey(recipe.ingredient1, recipe.ingredient2))
    );

    const reachableElements = allElements
      .filter((element) => tierByElementId.has(element._id))
      .sort(
        (a, b) => tierByElementId.get(a._id)! - tierByElementId.get(b._id)!
      );

    const candidates: {
      ingredient1: string;
      ingredient2: string;
      // The tier at which a player can first attempt this combination
      pairTier: number;
      tierSum: number;
    }[] = [];
    for (let i = 0; i < reachableElements.length; i++) {
      // j starts at i so self-combinations (e.g. Water + Water) are included
      for (let j = i; j < reachableElements.length; j++) {
        const element1 = reachableElements[i];
        const element2 = reachableElements[j];
        if (pairsWithRecipe.has(unorderedPairKey(element1._id, element2._id))) {
          continue;
        }
        const tier1 = tierByElementId.get(element1._id)!;
        const tier2 = tierByElementId.get(element2._id)!;
        candidates.push({
          ingredient1: element1.name,
          ingredient2: element2.name,
          pairTier: Math.max(tier1, tier2),
          tierSum: tier1 + tier2,
        });
      }
    }

    candidates.sort((a, b) => a.pairTier - b.pairTier || a.tierSum - b.tierSum);
    return candidates
      .slice(0, args.maxPairs)
      .map(({ ingredient1, ingredient2, pairTier }) => ({
        ingredient1,
        ingredient2,
        pairTier,
      }));
  },
});

export const getRecipeExamplesText = internalQuery({
  args: {
    element1: v.id("elements"),
    element2: v.id("elements"),
  },
  handler: async (ctx, args): Promise<string> => {
    const allRecipes = await ctx.db.query("recipes").collect();
    
    // Filter to only recipes that involve either of the input elements
    const relevantRecipes = allRecipes.filter((recipe) =>
      recipe.ingredient1 === args.element1 ||
      recipe.ingredient1 === args.element2 ||
      recipe.ingredient2 === args.element1 ||
      recipe.ingredient2 === args.element2 ||
      recipe.result === args.element1 ||
      recipe.result === args.element2
    );
    
    // If we have fewer than MIN_EXAMPLES, supplement with oldest recipes
    let recipesToUse = relevantRecipes;
    if (relevantRecipes.length < MIN_EXAMPLES) {
      const relevantIds = new Set(relevantRecipes.map((r) => r._id.toString()));
      const needed = MIN_EXAMPLES - relevantRecipes.length;
      
      // Get oldest recipes (by creation time) that aren't already included
      const oldestRecipes = allRecipes
        .filter((r) => !relevantIds.has(r._id.toString()))
        .sort((a, b) => a._creationTime - b._creationTime)
        .slice(0, needed);
      
      recipesToUse = [...relevantRecipes, ...oldestRecipes];
    }
    
    const examples = await Promise.all(
      recipesToUse.map(async (recipe) => {
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

export const listAllRecipes = internalQuery({
  args: {},
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").collect();
    return await Promise.all(recipes.map(async (recipe) => {
      const [ingredient1, ingredient2, result] = await Promise.all([
        ctx.db.get(recipe.ingredient1),
        ctx.db.get(recipe.ingredient2),
        ctx.db.get(recipe.result)
      ]);

      return {
        ingredient1: ingredient1!.name,
        ingredient2: ingredient2!.name,
        result: result!.name,
      };
    }));
  },
})
