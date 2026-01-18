import { action, internalMutation, query } from "./_generated/server";
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
  handler: async (ctx, args): Promise<string> => {
    let svg = args.SVG;

    // If SVG is empty, generate one using the AI action
    if (!svg || svg.trim() === "") {
      svg = await ctx.runAction(internal.ai.generateSVG, {
        elementName: args.name,
      });
    }

    const elementId: string = await ctx.runMutation(internal.elements.insertElement, {
      name: args.name,
      SVG: svg,
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
