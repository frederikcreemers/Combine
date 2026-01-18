import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  elements: defineTable({
    name: v.string(),
    SVG: v.string(),
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
