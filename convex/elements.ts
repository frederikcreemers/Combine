import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

export const insertElement = internalMutation({
  args: {
    name: v.string(),
    SVG: v.string(),
    discoveredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<string> => {
    const elementId = await ctx.db.insert("elements", {
      name: args.name,
      SVG: args.SVG,
      discoveredBy: args.discoveredBy,
    });
    return elementId;
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

export const getElement = internalQuery({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.elementId);
  },
});

export const getElementPublic = internalQuery({
  args: {
    elementId: v.id("elements"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.elementId);
  },
});

export const getElementByName = internalQuery({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("elements")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const updateElementSVG = internalMutation({
  args: {
    elementId: v.id("elements"),
    SVG: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.elementId, {
      SVG: args.SVG.trim(),
    });
  },
});

export const listElements = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("elements").collect();
  },
});
