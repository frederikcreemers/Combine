import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  elements: defineTable({
    name: v.string(),
    SVG: v.string(),
  }),
  recipes: defineTable({
    ingredient1: v.id("elements"),
    ingredient2: v.id("elements"),
    result: v.id("elements"),
  }),
});
