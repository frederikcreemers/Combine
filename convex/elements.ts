import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { optimize } from "svgo/browser";
import type { ActionCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export async function withSvgUrl(
  ctx: Pick<QueryCtx, "storage">,
  element: Doc<"elements">,
) {
  const svgUrl = await ctx.storage.getUrl(element.svgStorageId);
  if (!svgUrl) {
    throw new Error(`SVG file is missing for element ${element._id}`);
  }
  return {
    ...element,
    svgUrl,
  };
}

export async function storeSvg(
  ctx: Pick<ActionCtx, "storage">,
  svg: string,
): Promise<Id<"_storage">> {
  const optimizedSvg = optimizeSvg(svg);
  return await ctx.storage.store(
    new Blob([optimizedSvg], { type: "image/svg+xml" }),
  );
}

export function optimizeSvg(svg: string): string {
  const trimmedSvg = svg.trim();
  if (!trimmedSvg) {
    throw new Error("SVG cannot be empty");
  }

  const optimizedSvg = optimize(trimmedSvg, { multipass: true }).data;
  if (!/^<svg(?:\s|>)/.test(optimizedSvg)) {
    throw new Error("SVG must have an <svg> root element");
  }

  const encoder = new TextEncoder();
  return encoder.encode(optimizedSvg).byteLength <
    encoder.encode(trimmedSvg).byteLength
    ? optimizedSvg
    : trimmedSvg;
}

export async function readSvg(
  ctx: Pick<ActionCtx, "storage">,
  element: Doc<"elements">,
): Promise<string> {
  const blob = await ctx.storage.get(element.svgStorageId);
  if (!blob) {
    throw new Error(`SVG file is missing for element ${element._id}`);
  }
  return await blob.text();
}

export const insertElement = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    svgStorageId: v.id("_storage"),
    discoveredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<string> => {
    const elementId = await ctx.db.insert("elements", {
      name: args.name,
      description: args.description,
      svgStorageId: args.svgStorageId,
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
    svgStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db.get(args.elementId);
    if (!element) {
      await ctx.storage.delete(args.svgStorageId);
      throw new Error("Element not found");
    }
    await ctx.db.patch(args.elementId, {
      svgStorageId: args.svgStorageId,
    });
    if (element.svgStorageId !== args.svgStorageId) {
      await ctx.storage.delete(element.svgStorageId);
    }
  },
});

export const listElements = query({
  args: {},
  handler: async (ctx) => {
    const elements = await ctx.db.query("elements").collect();
    return await Promise.all(elements.map((element) => withSvgUrl(ctx, element)));
  },
});

export const listElementNames = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const elements = await ctx.db.query("elements").collect();
    return elements.map((e) => e.name);
  },
});
