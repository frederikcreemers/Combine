import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export async function withSvgUrl(
  ctx: Pick<QueryCtx, "storage">,
  element: Doc<"elements">,
) {
  return {
    ...element,
    svgUrl: element.svgStorageId
      ? await ctx.storage.getUrl(element.svgStorageId)
      : null,
  };
}

export async function storeSvg(
  ctx: Pick<ActionCtx, "storage">,
  svg: string,
): Promise<Id<"_storage">> {
  const trimmedSvg = svg.trim();
  if (!trimmedSvg) {
    throw new Error("SVG cannot be empty");
  }
  return await ctx.storage.store(
    new Blob([trimmedSvg], { type: "image/svg+xml" }),
  );
}

export async function readSvg(
  ctx: Pick<ActionCtx, "storage">,
  element: Doc<"elements">,
): Promise<string> {
  if (element.svgStorageId) {
    const blob = await ctx.storage.get(element.svgStorageId);
    if (!blob) {
      throw new Error(`SVG file is missing for element ${element._id}`);
    }
    return await blob.text();
  }
  if (element.SVG) {
    return element.SVG;
  }
  throw new Error(`Element ${element._id} has no SVG`);
}

export const insertElement = internalMutation({
  args: {
    name: v.string(),
    svgStorageId: v.id("_storage"),
    discoveredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<string> => {
    const elementId = await ctx.db.insert("elements", {
      name: args.name,
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
      SVG: undefined,
      svgStorageId: args.svgStorageId,
    });
    if (element.svgStorageId && element.svgStorageId !== args.svgStorageId) {
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

export const listUnmigratedElementSVGs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const elements = await ctx.db.query("elements").collect();
    return elements
      .filter((element) => !element.svgStorageId && element.SVG)
      .map((element) => ({
        elementId: element._id,
        SVG: element.SVG!,
      }));
  },
});

export const finishSvgMigration = internalMutation({
  args: {
    elementId: v.id("elements"),
    svgStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db.get(args.elementId);
    if (!element) {
      await ctx.storage.delete(args.svgStorageId);
      return false;
    }
    if (element.svgStorageId) {
      await ctx.storage.delete(args.svgStorageId);
      return false;
    }
    await ctx.db.patch(args.elementId, {
      svgStorageId: args.svgStorageId,
      SVG: undefined,
    });
    return true;
  },
});

/**
 * One-off migration for legacy inline SVGs. This intentionally migrates a
 * bounded number per invocation so it is safe to re-run from the CLI.
 */
export const migrateElementSVGsToStorage = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    migrated: number;
    remaining: number;
    done: boolean;
  }> => {
    const candidates: Array<{
      elementId: Id<"elements">;
      SVG: string;
    }> = await ctx.runQuery(
      internal.elements.listUnmigratedElementSVGs,
      {},
    );
    const batch = candidates.slice(0, Math.max(1, Math.min(args.limit ?? 50, 200)));
    let migrated = 0;

    for (const candidate of batch) {
      const svgStorageId = await storeSvg(ctx, candidate.SVG);
      const didMigrate = await ctx.runMutation(
        internal.elements.finishSvgMigration,
        { elementId: candidate.elementId, svgStorageId },
      );
      if (didMigrate) migrated++;
    }

    return {
      migrated,
      remaining: Math.max(0, candidates.length - migrated),
      done: candidates.length === migrated,
    };
  },
});
