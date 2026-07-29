import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  elements: defineTable({
    name: v.string(),
    // SVG is temporarily optional while existing rows are migrated to storage.
    // Remove it after both deployments have been fully migrated.
    SVG: v.optional(v.string()),
    svgStorageId: v.optional(v.id("_storage")),
    discoveredBy: v.optional(v.id("users")),
  })
    .index("by_name", ["name"])
    .index("by_discoveredBy", ["discoveredBy"]),
  recipes: defineTable({
    ingredient1: v.id("elements"),
    ingredient2: v.id("elements"),
    result: v.id("elements"),
  }),
  unlockedElements: defineTable({
    elementId: v.id("elements"),
    userId: v.id("users"),
  }).index("by_user", ["userId"]),
  adminUsers: defineTable({
    userId: v.id("users"),
  }).index("by_user", ["userId"]),
});
