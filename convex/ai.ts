import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Shared helper to capitalize element names
export function capitalizeElementName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const MAX_ELEMENT_NAME_LENGTH = 30;
const MAX_GENERATION_RETRIES = 3;

export async function generateRecipe(
  ingredient1Name: string,
  ingredient2Name: string,
  recipeExamples: string,
  existingElements: string[]
): Promise<string> {
  const elementsList = existingElements.length > 0 
    ? existingElements.join(", ")
    : "None yet";
    
  const prompt = `You are a recipe generator for a game where elements can be combined.

All existing elements in the game:
${elementsList}

Existing recipes (examples):
${recipeExamples || "None yet"}

Given two elements to combine: "${ingredient1Name}" and "${ingredient2Name}"

Determine what the result should be. You can:
1. PREFER reusing an existing element from the list above when it makes sense - this keeps the game cohesive
2. Create a new element name only if no existing element fits well - optimize for results that are interesting to build upon further
3. Respond with "NO RESULT" if these elements should not be combinable
4. Feel free to make the result the same as one of the ingredients. For instance beekeeper + human = beekeeper makes sense, because a human beekeeper is still just a beekeeper.
5. Also consider whimsical combinations, like sky + cheese = moon.

IMPORTANT: Reply with ONLY the result element name (or "NO RESULT"), nothing else. No explanations, no markdown, just the name. Keep the name short (under ${MAX_ELEMENT_NAME_LENGTH} characters).`;

  for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
    const result = await callOpenRouter(prompt);
    const trimmed = result.trim();
    
    // Accept "NO RESULT" regardless of length
    if (trimmed.toUpperCase() === "NO RESULT") {
      return trimmed;
    }
    
    // Retry if the result is too long
    if (trimmed.length <= MAX_ELEMENT_NAME_LENGTH) {
      return trimmed;
    }
    
    console.log(`Generated name too long (${trimmed.length} chars): "${trimmed}", retrying...`);
  }
  
  // After max retries, return "NO RESULT" as a fallback
  console.log(`Failed to generate short name after ${MAX_GENERATION_RETRIES} attempts`);
  return "NO RESULT";
}

export async function suggestRecipes(allRecipes: { ingredient1: string; ingredient2: string; result: string }[]): Promise<{ ingredient1: string; ingredient2: string; result: string }[]> {
  const prompt = `The following is a list of "recipes" in a Little Alchemy-like game where the player combines 2 elements to create a third one.
  
  ${allRecipes.map((recipe) => `${recipe.ingredient1} + ${recipe.ingredient2} = ${recipe.result}`).join("\n")}

  Suggest 50 new recipes that would be fun to add to this game.
  - The recipes should use a unique pair of ingredients (order does not matter) so they don't match an existing pair.
  - Focus first on combining missing recipes that players are likely to try out.
  - Whenever suitable, make the result of a recipe an existing element.
  - When introducing new elements, prioritize elements being fun to build upon, over being completely logical.
  - Also consider combinations that might be a little bit whimsical, like sky + cheese = moon

  Reply with only the recipes, one per line, in the format: "ingredient1 + ingredient2 = result"
  No explanations, no markdown, just the recipes.
`;

  const result = await callOpenRouter(prompt);
  return result.split("\n").map((recipeLine) => {
    if (!recipeLine.includes("+") || !recipeLine.includes("=")) {
      return null;
    }
    const [ingredients, result] = recipeLine.split("=");
    const [ingredient1, ingredient2] = ingredients.split("+");

    return {
      ingredient1: ingredient1.trim(),
      ingredient2: ingredient2.trim(),
      result: result.trim(),
    };
  }).filter((recipe) => recipe !== null);
}

const MODEL_RECIPE = "openai/gpt-5.2";
const MODEL_SVG = "google/gemini-3-flash-preview";

async function callOpenRouter(prompt: string, model: string = MODEL_RECIPE): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

function extractSVG(content: string): string {
  let svgContent = content.trim();

  // Remove markdown code blocks if present
  const svgMatch = svgContent.match(/```(?:svg)?\s*([\s\S]*?)```/);
  if (svgMatch) {
    svgContent = svgMatch[1].trim();
  }

  // If the content doesn't start with <svg, try to find it
  if (!svgContent.startsWith("<svg")) {
    const svgTagMatch = svgContent.match(/<svg[\s\S]*<\/svg>/i);
    if (svgTagMatch) {
      svgContent = svgTagMatch[0];
    }
  }

  // Ensure we have valid SVG
  if (!svgContent.startsWith("<svg")) {
    throw new Error("Failed to generate valid SVG");
  }

  return svgContent;
}

export const generateSVG = internalAction({
  args: {
    elementName: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `Generate an SVG illustration of "${args.elementName}" in a slightly cartoony style on a transparent background. The SVG should fit nicely inside a square frame. Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return only the SVG code, without any markdown formatting or explanations.`;

    const content = await callOpenRouter(prompt, MODEL_SVG);
    return extractSVG(content);
  },
});

export const regenerateSVG = internalAction({
  args: {
    elementName: v.string(),
    oldSVG: v.string(),
    feedback: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `You are updating an SVG illustration of "${args.elementName}". Here is the current SVG:

${args.oldSVG}

User feedback: ${args.feedback}

Please generate an improved version of this SVG based on the feedback. Keep it in a slightly cartoony style on a transparent background, and ensure it fits nicely inside a square frame. Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return only the SVG code, without any markdown formatting or explanations.`;

    const content = await callOpenRouter(prompt, MODEL_SVG);
    return extractSVG(content);
  },
});
