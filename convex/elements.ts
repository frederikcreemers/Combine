import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addElement = mutation({
  args: {
    name: v.string(),
    SVG: v.string(),
  },
  handler: async (ctx, args) => {
    const elementId = await ctx.db.insert("elements", {
      name: args.name,
      SVG: args.SVG,
    });
    return elementId;
  },
});

export const listElements = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("elements").collect();
  },
});
