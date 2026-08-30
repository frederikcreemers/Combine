import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

const MODEL_GEMINI_RECIPE = "google/gemini-3.6-flash";
const MODEL_GEMINI_SVG = "google/gemini-3.5-flash-lite";
const MODEL_OPENAI = "openai/gpt-5.6-terra";

type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type ModelUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
};

// Minimal action context needed to persist cost logs
export type AiLogCtx = {
  runMutation: (...args: any[]) => Promise<any>;
};

function aggregateModelUsages(usages: ModelUsage[]) {
  const byModel = new Map<
    string,
    {
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
      calls: number;
    }
  >();

  for (const usage of usages) {
    const existing = byModel.get(usage.model);
    if (existing) {
      existing.promptTokens += usage.promptTokens;
      existing.completionTokens += usage.completionTokens;
      existing.totalTokens += usage.totalTokens;
      existing.cost += usage.cost;
      existing.calls += 1;
    } else {
      byModel.set(usage.model, {
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        cost: usage.cost,
        calls: 1,
      });
    }
  }

  return [...byModel.values()];
}

async function recordAiCost(
  ctx: AiLogCtx,
  description: string,
  usages: ModelUsage[]
) {
  if (usages.length === 0) return;

  const models = aggregateModelUsages(usages);
  const totalTokens = models.reduce((sum, model) => sum + model.totalTokens, 0);
  const totalCost = models.reduce((sum, model) => sum + model.cost, 0);

  try {
    await ctx.runMutation(internal.aiCostLogs.insert, {
      description,
      models,
      totalTokens,
      totalCost,
    });
  } catch (error) {
    // Cost logging must never break generation
    console.error("Failed to record AI cost log:", error);
  }
}

function buildRecipePrompt(
  ingredient1Name: string,
  ingredient2Name: string,
  recipeExamples: string,
  existingElements: string[],
  withSurpriseCheck: boolean,
): string {
  const elementsList =
    existingElements.length > 0 ? existingElements.join(", ") : "None yet";

  const basePrompt = `You are a recipe generator for a game where elements can be combined.

All existing elements in the game:
${elementsList}

Existing recipes (examples):
${recipeExamples || "None yet"}

Given two elements to combine: "${ingredient1Name}" and "${ingredient2Name}"

Determine what the result should be. Every combination must produce a result. First look for a direct physical, causal, or commonly understood result. If there is none, use a strong metaphorical, cultural, wordplay, or whimsical association. Never respond with "NO RESULT".

When choosing the result:
1. PREFER reusing an existing element from the list above when it makes sense - this keeps the game cohesive
2. Create a new element name only if no existing element fits well - optimize for results that are interesting to build upon further
3. Prefer a result that is different from both ingredients. Returning one of the ingredients is allowed only when combining them genuinely leaves that ingredient unchanged, and only when no other existing element describes the result better. Before returning either ingredient, check the existing elements and relevant recipe patterns for a more specific result. For example, when a profession or activity is combined with "Tool", prefer its characteristic existing tool.
4. Also consider whimsical combinations, like sky + cheese = moon.
5. Elements like "Idea" or "Philosophy" can be combined with concrete things to create broad concepts (e.g. burger + philosophy = food), but limit this to a small set of widely applicable concepts rather than creating overly specific abstractions.

Keep the name short (under ${MAX_ELEMENT_NAME_LENGTH} characters).`;

  if (withSurpriseCheck) {
    return `${basePrompt}

Reply with JSON in this exact format (no markdown, no explanation):
{"result": "ElementName", "surprising": true}

- "result" must be a short element name, never "NO RESULT"
- "surprising" should be true if this combination is unexpected/creative/whimsical, false if it's obvious/straightforward`;
  } else {
    return `${basePrompt}

IMPORTANT: Reply with ONLY the result element name, nothing else. Never reply with "NO RESULT". No explanations, no markdown, just the name.`;
  }
}

interface GeminiRecipeResponse {
  result: string;
  surprising: boolean;
}

function isValidRecipeResult(result: string): boolean {
  const trimmed = result.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_ELEMENT_NAME_LENGTH &&
    trimmed.toUpperCase() !== "NO RESULT"
  );
}

function parseGeminiResponse(response: string): GeminiRecipeResponse | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.result === "string" &&
      typeof parsed.surprising === "boolean"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateRecipe(
  ctx: AiLogCtx,
  ingredient1Name: string,
  ingredient2Name: string,
  recipeExamples: string,
  existingElements: string[],
): Promise<string> {
  const usages: ModelUsage[] = [];
  try {
    // First, try with Gemini Flash to get result + surprise indicator
    const geminiPrompt = buildRecipePrompt(
      ingredient1Name,
      ingredient2Name,
      recipeExamples,
      existingElements,
      true,
    );

    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
      const { content: geminiResponse, usage: geminiUsage } = await callOpenRouter(
        geminiPrompt,
        MODEL_GEMINI_RECIPE,
        "minimal",
      );
      usages.push(geminiUsage);

      const parsed = parseGeminiResponse(geminiResponse);

      if (!parsed) {
        console.log(`Failed to parse Gemini response, retrying...`);
        continue;
      }

      const trimmed = parsed.result.trim();

      // Treat malformed results and refusals as generation failures, not game outcomes.
      if (!isValidRecipeResult(trimmed)) {
        console.log(
          `Generated invalid recipe result "${trimmed}", retrying...`,
        );
        continue;
      }

      // If surprising, get a second opinion from OpenAI
      if (parsed.surprising) {
        console.log(
          `Gemini found surprising result "${trimmed}" for ${ingredient1Name} + ${ingredient2Name}, consulting OpenAI...`,
        );
        const openaiPrompt = buildRecipePrompt(
          ingredient1Name,
          ingredient2Name,
          recipeExamples,
          existingElements,
          false,
        );
        const { content: openaiResult, usage: openaiUsage } = await callOpenRouter(
          openaiPrompt,
          MODEL_OPENAI,
          "none",
        );
        usages.push(openaiUsage);
        const openaiTrimmed = openaiResult.trim();

        if (isValidRecipeResult(openaiTrimmed)) {
          console.log(`OpenAI suggested "${openaiTrimmed}" instead`);
          return openaiTrimmed;
        }
      }

      return trimmed;
    }

    throw new Error(
      `Failed to generate a valid recipe after ${MAX_GENERATION_RETRIES} attempts`,
    );
  } finally {
    await recordAiCost(
      ctx,
      `Generate recipe: ${ingredient1Name} + ${ingredient2Name}`,
      usages
    );
  }
}

export async function generateElementDescription(
  ctx: AiLogCtx,
  elementName: string,
): Promise<string> {
  const usages: ModelUsage[] = [];
  try {
    const prompt = `You are writing witty one-line descriptions for elements in a Little Alchemy-like game where players combine elements to discover new ones.

Examples of the tone to match:
Land: Anything on Earth's surface that isn't covered by water, but is owned by Woody Guthrie and YOU!
Life: It finds a way.
Electricity: Charged particles, or as it's more technically known: THE POWER OF THE GODS.
Wind: Air that blows all over the place and defies all attempts at prediction.
Brick: A block of hardened clay that's used for construction and metaphors.
Sky: The domain of clouds.
Atmosphere: The layer of gases surrounding our planet that protects us from various invisible space horrors.
Planet: A star dancer.
Computer: An electronic device that can both aid and hinder work.
Boat: A craft that allows one to travel over water while still being at its mercy.
Book: The afterlife of trees.
Chainsaw: Mechanical saw with spinning teeth of DEATH.
Heat: A quality of either increased temperature, feeling, social standing, or police presence.

Write a witty one-line description for the element "${elementName}".

Reply with ONLY the description text. No quotes, no explanations, no markdown.`;

    const { content: result, usage } = await callOpenRouter(
      prompt,
      MODEL_OPENAI,
      "low"
    );
    usages.push(usage);
    // Models sometimes wrap the description in quotes despite instructions
    return result
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .trim();
  } finally {
    await recordAiCost(ctx, `Generate description: ${elementName}`, usages);
  }
}

export async function suggestRecipes(
  ctx: AiLogCtx,
  allRecipes: { ingredient1: string; ingredient2: string; result: string }[],
): Promise<{ ingredient1: string; ingredient2: string; result: string }[]> {
  const usages: ModelUsage[] = [];
  try {
    const prompt = `The following is a list of "recipes" in a Little Alchemy-like game where the player combines 2 elements to create a third one.
  
  ${allRecipes.map((recipe) => `${recipe.ingredient1} + ${recipe.ingredient2} = ${recipe.result}`).join("\n")}

  Suggest 50 new recipes that would be fun to add to this game.
  - The recipes should use a unique pair of ingredients (order does not matter) so they don't match an existing pair.
  - Focus first on making missing combinations that players are likely to try out.
  - Whenever suitable, make the result of a recipe an existing element.
  - When introducing new elements, prioritize elements being fun to build upon, over being completely logical.
  - Also consider combinations that might be a little bit whimsical, like sky + cheese = moon
  - Elements like "Idea" or "Philosophy" can combine with concrete things to create broad concepts (e.g. burger + philosophy = food), but limit this to a small set of widely applicable concepts.

  Reply with only the recipes, one per line, in the format: "ingredient1 + ingredient2 = result"
  No explanations, no markdown, just the recipes.
`;

    const { content: result, usage } = await callOpenRouter(
      prompt,
      MODEL_OPENAI,
      "none"
    );
    usages.push(usage);
    return result
      .split("\n")
      .map((recipeLine) => {
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
      })
      .filter((recipe) => recipe !== null);
  } finally {
    await recordAiCost(ctx, "Suggest recipes", usages);
  }
}

export async function suggestRecipesForPairs(
  ctx: AiLogCtx,
  pairs: { ingredient1: string; ingredient2: string }[],
  allRecipes: { ingredient1: string; ingredient2: string; result: string }[],
  existingElements: string[],
): Promise<{ ingredient1: string; ingredient2: string; result: string }[]> {
  const usages: ModelUsage[] = [];
  try {
    const prompt = `The following is a list of "recipes" in a Little Alchemy-like game where the player combines 2 elements to create a third one.

${allRecipes.map((recipe) => `${recipe.ingredient1} + ${recipe.ingredient2} = ${recipe.result}`).join("\n")}

All existing elements in the game:
${existingElements.join(", ")}

The following combinations have no recipe yet, but players are likely to try them early in the game. For EACH combination, determine what the result should be:

${pairs.map((pair) => `${pair.ingredient1} + ${pair.ingredient2}`).join("\n")}

Guidelines:
- PREFER reusing an existing element from the list above when it makes sense - this keeps the game cohesive.
- When introducing new elements, prioritize elements being fun to build upon, over being completely logical.
- Also consider combinations that might be a little bit whimsical, like sky + cheese = moon.
- Every combination must produce a result. If there is no direct result, use a strong metaphorical, cultural, wordplay, or whimsical association.
- Keep element names short (under ${MAX_ELEMENT_NAME_LENGTH} characters).

Reply with one line per combination, in the same order as listed above, in the format: "ingredient1 + ingredient2 = result"
No explanations, no markdown, just the recipes.
`;

    const { content: response, usage } = await callOpenRouter(
      prompt,
      MODEL_OPENAI,
      "none"
    );
    usages.push(usage);

    // Only keep lines that match a requested pair, so hallucinated pairs are dropped
    // and ingredient names are restored to their canonical casing.
    const pairKey = (nameA: string, nameB: string) => {
      const a = nameA.trim().toLowerCase();
      const b = nameB.trim().toLowerCase();
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    };
    const requestedPairs = new Map(
      pairs.map((pair) => [pairKey(pair.ingredient1, pair.ingredient2), pair]),
    );

    const suggestions: { ingredient1: string; ingredient2: string; result: string }[] = [];
    for (const line of response.split("\n")) {
      if (!line.includes("+") || !line.includes("=")) continue;
      const [ingredientsPart, resultPart] = line.split("=");
      const [ingredient1, ingredient2] = ingredientsPart.split("+");
      if (!ingredient1 || !ingredient2 || !resultPart) continue;

      const matchedKey = pairKey(ingredient1, ingredient2);
      const requestedPair = requestedPairs.get(matchedKey);
      if (!requestedPair) continue;
      requestedPairs.delete(matchedKey); // dedupe if the model repeats a pair

      const result = resultPart.trim();
      if (!isValidRecipeResult(result)) continue;

      suggestions.push({
        ingredient1: requestedPair.ingredient1,
        ingredient2: requestedPair.ingredient2,
        result: capitalizeElementName(result),
      });
    }
    return suggestions;
  } finally {
    await recordAiCost(
      ctx,
      `Suggest early-game recipes (${pairs.length} pairs)`,
      usages
    );
  }
}

async function callOpenRouter(
  prompt: string,
  model: string,
  reasoningEffort: ReasoningEffort,
): Promise<{ content: string; usage: ModelUsage }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: reasoningEffort },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  const usageData = data.usage ?? {};
  const promptTokens = Number(usageData.prompt_tokens ?? 0);
  const completionTokens = Number(usageData.completion_tokens ?? 0);
  const totalTokens = Number(
    usageData.total_tokens ?? promptTokens + completionTokens
  );
  const cost = Number(usageData.cost ?? 0);

  return {
    content: data.choices[0]?.message?.content || "",
    usage: {
      model: typeof data.model === "string" ? data.model : model,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
    },
  };
}

export function minifySVG(svg: string): string {
  return (
    svg
      // Remove XML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove whitespace between tags
      .replace(/>\s+</g, "><")
      // Remove leading/trailing whitespace
      .trim()
      // Collapse multiple spaces in attributes to single space
      .replace(/\s{2,}/g, " ")
      // Remove space before closing bracket
      .replace(/\s+>/g, ">")
      // Remove space before self-closing bracket
      .replace(/\s+\/>/g, "/>")
      // Remove unnecessary semicolons in style attributes
      .replace(/;"/g, '"')
      // Remove empty style attributes
      .replace(/\s*style=""\s*/g, " ")
      // Remove empty class attributes
      .replace(/\s*class=""\s*/g, " ")
      // Clean up any double spaces created
      .replace(/\s{2,}/g, " ")
  );
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

  return minifySVG(svgContent);
}

export const generateSVG = internalAction({
  args: {
    elementName: v.string(),
  },
  handler: async (ctx, args) => {
    const usages: ModelUsage[] = [];
    try {
      const prompt = `Generate an SVG illustration of "${args.elementName}" in a slightly cartoony style on a transparent background. The SVG should fit nicely inside a square frame. Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return only the SVG code, without any markdown formatting or explanations.`;

      const { content, usage } = await callOpenRouter(
        prompt,
        MODEL_GEMINI_SVG,
        "minimal"
      );
      usages.push(usage);
      return extractSVG(content);
    } finally {
      await recordAiCost(ctx, `Generate SVG: ${args.elementName}`, usages);
    }
  },
});

export const regenerateSVG = internalAction({
  args: {
    elementName: v.string(),
    oldSVG: v.string(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const usages: ModelUsage[] = [];
    try {
      const prompt = `You are updating an SVG illustration of "${args.elementName}". Here is the current SVG:

${args.oldSVG}

User feedback: ${args.feedback}

Please generate an improved version of this SVG based on the feedback. Keep it in a slightly cartoony style on a transparent background, and ensure it fits nicely inside a square frame. Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return only the SVG code, without any markdown formatting or explanations.`;

      const { content, usage } = await callOpenRouter(
        prompt,
        MODEL_GEMINI_SVG,
        "minimal"
      );
      usages.push(usage);
      return extractSVG(content);
    } finally {
      await recordAiCost(
        ctx,
        `Regenerate SVG: ${args.elementName} (${args.feedback.slice(0, 80)})`,
        usages
      );
    }
  },
});
