import { action, internalMutation, internalQuery, query } from "./_generated/server";
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
