import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  elements: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    svgStorageId: v.id("_storage"),
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
  // One row per AI generation operation (recipe, SVG, description, etc.).
  // `models` aggregates token usage and cost per model used in that operation.
  ai_cost_logs: defineTable({
    description: v.string(),
    models: v.array(
      v.object({
        model: v.string(),
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
        cost: v.number(),
        calls: v.number(),
      })
    ),
    totalTokens: v.number(),
    totalCost: v.number(),
  }),
});
