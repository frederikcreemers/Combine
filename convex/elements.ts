import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const insertElement = internalMutation({
  args: {
    name: v.string(),
    SVG: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const elementId = await ctx.db.insert("elements", {
      name: args.name,
      SVG: args.SVG,
    });
    return elementId;
  },
});

export const addElement = action({
  args: {
    name: v.string(),
    SVG: v.string(),
  },
  handler: async (ctx, args): Promise<{ id: string; name: string }> => {
    // Check if element with this name already exists
    const existing = await ctx.runQuery(internal.elements.findByName, {
      name: args.name.trim(),
    });

    if (existing) {
      return { id: existing._id, name: existing.name };
    }

    let svg = args.SVG;

    // If SVG is empty, generate one using the AI action
    if (!svg || svg.trim() === "") {
      svg = await ctx.runAction(internal.ai.generateSVG, {
        elementName: args.name,
      });
    }

    const elementId: string = await ctx.runMutation(internal.elements.insertElement, {
      name: args.name.trim(),
      SVG: svg,
    });

    return { id: elementId, name: args.name.trim() };
  },
});

export const findByName = internalQuery({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db
      .query("elements")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    return element || null;
  },
});

export const getElement = query({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.elementId);
  },
});

export const listElements = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("elements").collect();
  },
});

export const deleteElement = mutation({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
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

    // Delete the element itself
    await ctx.db.delete(args.elementId);
  },
});
