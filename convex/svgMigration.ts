import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { optimizeSvg } from "./elements";
import type { Id } from "./_generated/dataModel";

const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;

export const listElementBatch = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query("elements").paginate(args.paginationOpts);
  },
});

export const replaceElementSvg = internalMutation({
  args: {
    elementId: v.id("elements"),
    expectedStorageId: v.id("_storage"),
    newStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db.get(args.elementId);
    if (!element || element.svgStorageId !== args.expectedStorageId) {
      await ctx.storage.delete(args.newStorageId);
      return false;
    }

    await ctx.db.patch(args.elementId, { svgStorageId: args.newStorageId });
    await ctx.storage.delete(args.expectedStorageId);
    return true;
  },
});

type MigrationFailure = {
  elementId: Id<"elements">;
  name: string;
  error: string;
};

type BatchResult = {
  continueCursor: string;
  isDone: boolean;
  processed: number;
  updated: number;
  unchanged: number;
  skippedBecauseModified: number;
  bytesBefore: number;
  bytesAfter: number;
  failures: MigrationFailure[];
};

// Temporary migration entry point. Run it through scripts/optimize-element-svgs.mjs,
// then remove this file and the runner once every deployment has been migrated.
export const optimizeBatch = internalAction({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<BatchResult> => {
    const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
    if (
      !Number.isInteger(batchSize) ||
      batchSize < 1 ||
      batchSize > MAX_BATCH_SIZE
    ) {
      throw new Error(`batchSize must be an integer from 1 to ${MAX_BATCH_SIZE}`);
    }

    const batch = await ctx.runQuery(internal.svgMigration.listElementBatch, {
      paginationOpts: {
        cursor: args.cursor,
        numItems: batchSize,
      },
    });

    let updated = 0;
    let unchanged = 0;
    let skippedBecauseModified = 0;
    let bytesBefore = 0;
    let bytesAfter = 0;
    const failures: MigrationFailure[] = [];

    for (const element of batch.page) {
      try {
        const blob = await ctx.storage.get(element.svgStorageId);
        if (!blob) {
          throw new Error("Stored SVG is missing");
        }

        const source = await blob.text();
        const optimized = optimizeSvg(source);
        const sourceBytes = new Blob([source]).size;
        const optimizedBytes = new Blob([optimized]).size;
        bytesBefore += sourceBytes;
        bytesAfter += optimizedBytes;

        if (optimized === source) {
          unchanged += 1;
          continue;
        }
        if (args.dryRun) {
          updated += 1;
          continue;
        }

        const newStorageId = await ctx.storage.store(
          new Blob([optimized], { type: "image/svg+xml" }),
        );
        const replaced = await ctx.runMutation(
          internal.svgMigration.replaceElementSvg,
          {
            elementId: element._id,
            expectedStorageId: element.svgStorageId,
            newStorageId,
          },
        );
        if (replaced) {
          updated += 1;
        } else {
          skippedBecauseModified += 1;
        }
      } catch (error) {
        failures.push({
          elementId: element._id,
          name: element.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      continueCursor: batch.continueCursor,
      isDone: batch.isDone,
      processed: batch.page.length,
      updated,
      unchanged,
      skippedBecauseModified,
      bytesBefore,
      bytesAfter,
      failures,
    };
  },
});
