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
const MAX_RECIPE_SUGGESTIONS = 50;

const RECIPE_POLICY = `Use this decision process for every pair:
1. Choose the most cohesive result. Prefer a direct physical, causal, compound-word, or conventional association.
2. When no direct result fits, use a recognizable cultural, metaphorical, wordplay, or whimsical association. A whimsical result still has a clear connection, such as Sky + Cheese = Moon.
3. Reuse an existing element when it is at least as precise and useful as a new element. Otherwise create a broadly reusable new element.
4. Prefer a result different from both ingredients. Return an ingredient only when the combination conventionally leaves it unchanged and no more specific result fits.
5. Prefer specific, reusable concepts. Use broad abstractions only when they express the clearest relationship between the ingredients.

Every pair has exactly one result. Each result is a non-empty element name from 1 to ${MAX_ELEMENT_NAME_LENGTH} characters.`;

const MODEL_GEMINI_RECIPE = "google/gemini-3.6-flash";
const MODEL_SVG = "openai/gpt-5.6-luna:nitro";
const MODEL_OPENAI = "openai/gpt-5.6-terra";
const SVG_MAX_COMPLETION_TOKENS = 4096;
const SVG_TEXT_POLICY = `Depict the concept visually rather than spelling out or labeling the requested element. Do not add text merely as decoration or as a shortcut for conveying the concept. Include text only when the wording is an intrinsic, recognizable, and important part of the depicted subject, such as a proper name or title on an object, or essential wording on a sign.`;
const SVG_COMPLEXITY_POLICY = `Keep the SVG compact: use at most 24 visible graphical elements, prefer basic shapes and concise path data, and use at most two gradients. Do not use filters, embedded raster images, scripts, animation, metadata, comments, CSS blocks, or unnecessary groups. Write compact markup with minimal whitespace.`;

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
): string {
  const elementsList =
    existingElements.length > 0 ? existingElements.join(", ") : "None yet";

  const basePrompt = `You generate cohesive recipes for a combination game.

Task: choose the result of combining "${ingredient1Name}" and "${ingredient2Name}".

<existing-elements>
${elementsList}
</existing-elements>

<recipe-examples>
${recipeExamples || "None yet"}
</recipe-examples>

${RECIPE_POLICY}`;

  return `${basePrompt}

Return exactly one JSON object in this shape:
{"result": "ElementName", "surprising": true}

- "result" is the chosen element name.
- "surprising" is false for a direct physical, causal, compound-word, or conventional association. It is true when the result depends on metaphor, wordplay, or an unconventional cultural association.`;
}

function buildRecipeReviewPrompt(
  ingredient1Name: string,
  ingredient2Name: string,
  candidate: string,
  recipeExamples: string,
  existingElements: string[],
): string {
  return `You review a proposed recipe for a combination game.

Task: review the candidate result for combining "${ingredient1Name}" and "${ingredient2Name}".

<candidate>
${candidate}
</candidate>

<existing-elements>
${existingElements.length > 0 ? existingElements.join(", ") : "None yet"}
</existing-elements>

<recipe-examples>
${recipeExamples || "None yet"}
</recipe-examples>

${RECIPE_POLICY}

Keep the candidate when it is cohesive and satisfies the policy. Replace it only when another result is clearly more precise, recognizable, or reusable.

Reply with exactly one element name: either the original candidate or its replacement.`;
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

      // Ask a second model to review nonliteral candidates before accepting them.
      if (parsed.surprising) {
        console.log(
          `Gemini found surprising result "${trimmed}" for ${ingredient1Name} + ${ingredient2Name}, consulting OpenAI...`,
        );
        const openaiPrompt = buildRecipeReviewPrompt(
          ingredient1Name,
          ingredient2Name,
          trimmed,
          recipeExamples,
          existingElements,
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
    const prompt = `You write concise, witty descriptions for elements in a combination game.

Task: describe the element "${elementName}" with a recognizable property and one concise joke, twist, or unexpected comparison.

Tone examples:
Life: It finds a way.
Electricity: Charged particles, or as it's more technically known: THE POWER OF THE GODS.
Brick: A block of hardened clay that's used for construction and metaphors.
Atmosphere: The layer of gases surrounding our planet that protects us from various invisible space horrors.
Book: The afterlife of trees.
Heat: A quality of either increased temperature, feeling, social standing, or police presence.

Return exactly one plain-text sentence of at most 20 words.`;

    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
      const { content: result, usage } = await callOpenRouter(
        prompt,
        MODEL_OPENAI,
        "low",
      );
      usages.push(usage);
      // Be tolerant of quotes at the model boundary while enforcing the content contract.
      const description = result
        .trim()
        .replace(/^["']+|["']+$/g, "")
        .trim();
      const wordCount = description ? description.split(/\s+/).length : 0;
      if (
        wordCount >= 1 &&
        wordCount <= 20 &&
        !description.includes("\n") &&
        !description.includes("\r")
      ) {
        return description;
      }
    }

    throw new Error(
      `Failed to generate a valid description after ${MAX_GENERATION_RETRIES} attempts`,
    );
  } finally {
    await recordAiCost(ctx, `Generate description: ${elementName}`, usages);
  }
}

type RecipeSuggestion = {
  ingredient1: string;
  ingredient2: string;
  result: string;
};

function unorderedPairKey(nameA: string, nameB: string): string {
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function parseRecipeLine(line: string): RecipeSuggestion | null {
  const match = line.match(/^([^+=]+?)\s*\+\s*([^+=]+?)\s*=\s*([^=]+?)$/);
  if (!match) return null;
  return {
    ingredient1: match[1].trim(),
    ingredient2: match[2].trim(),
    result: match[3].trim(),
  };
}

export async function suggestRecipes(
  ctx: AiLogCtx,
  allRecipes: RecipeSuggestion[],
  existingElements: string[],
): Promise<RecipeSuggestion[]> {
  const usages: ModelUsage[] = [];
  const existingPairKeys = new Set(
    allRecipes.map((recipe) =>
      unorderedPairKey(recipe.ingredient1, recipe.ingredient2),
    ),
  );
  const possiblePairCount =
    (existingElements.length * (existingElements.length + 1)) / 2;
  const requestedCount = Math.min(
    MAX_RECIPE_SUGGESTIONS,
    Math.max(0, possiblePairCount - existingPairKeys.size),
  );
  if (requestedCount === 0) return [];

  try {
    const prompt = `You propose cohesive missing recipes for a combination game.

Task: propose exactly ${requestedCount} recipes using pairs that players are likely to try.

<existing-elements>
${existingElements.join(", ")}
</existing-elements>

<existing-recipes>
${allRecipes.map((recipe) => `${recipe.ingredient1} + ${recipe.ingredient2} = ${recipe.result}`).join("\n")}
</existing-recipes>

${RECIPE_POLICY}

Completion criteria:
- Return exactly ${requestedCount} lines.
- Format every line as: ingredient1 + ingredient2 = result
- Copy both ingredient names verbatim from the existing-elements list.
- Use each unordered ingredient pair once, and use only pairs absent from existing-recipes.
- Order the recipes from most likely to be tried to least likely.

Return only the recipe lines.`;

    const existingElementNames = new Set(existingElements);
    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
      const { content: response, usage } = await callOpenRouter(
        prompt,
        MODEL_OPENAI,
        "none",
      );
      usages.push(usage);

      const lines = response.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length !== requestedCount) continue;

      const seenPairKeys = new Set<string>();
      const suggestions: RecipeSuggestion[] = [];
      let complete = true;
      for (const line of lines) {
        const suggestion = parseRecipeLine(line);
        if (
          !suggestion ||
          !existingElementNames.has(suggestion.ingredient1) ||
          !existingElementNames.has(suggestion.ingredient2) ||
          !isValidRecipeResult(suggestion.result)
        ) {
          complete = false;
          break;
        }

        const pairKey = unorderedPairKey(
          suggestion.ingredient1,
          suggestion.ingredient2,
        );
        if (existingPairKeys.has(pairKey) || seenPairKeys.has(pairKey)) {
          complete = false;
          break;
        }
        seenPairKeys.add(pairKey);
        suggestions.push({
          ...suggestion,
          result: capitalizeElementName(suggestion.result),
        });
      }

      if (complete && suggestions.length === requestedCount) {
        return suggestions;
      }
    }

    throw new Error(
      `Failed to generate ${requestedCount} complete recipe suggestions after ${MAX_GENERATION_RETRIES} attempts`,
    );
  } finally {
    await recordAiCost(ctx, "Suggest recipes", usages);
  }
}

export async function suggestRecipesForPairs(
  ctx: AiLogCtx,
  pairs: { ingredient1: string; ingredient2: string }[],
  allRecipes: RecipeSuggestion[],
  existingElements: string[],
): Promise<RecipeSuggestion[]> {
  if (pairs.length === 0) return [];
  const usages: ModelUsage[] = [];
  try {
    const prompt = `You assign cohesive results to missing recipes in a combination game.

Task: choose one result for every requested pair.

<existing-recipes>
${allRecipes.map((recipe) => `${recipe.ingredient1} + ${recipe.ingredient2} = ${recipe.result}`).join("\n")}
</existing-recipes>

<existing-elements>
${existingElements.join(", ")}
</existing-elements>

<requested-pairs>
${pairs.map((pair) => `${pair.ingredient1} + ${pair.ingredient2}`).join("\n")}
</requested-pairs>

${RECIPE_POLICY}

Completion criteria:
- Return exactly ${pairs.length} lines, one for each requested pair.
- Preserve the requested-pairs order.
- Copy both ingredient names verbatim and preserve their displayed order.
- Format every line as: ingredient1 + ingredient2 = result

Return only the recipe lines.`;

    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
      const { content: response, usage } = await callOpenRouter(
        prompt,
        MODEL_OPENAI,
        "none",
      );
      usages.push(usage);

      const lines = response.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length !== pairs.length) continue;

      const suggestions: RecipeSuggestion[] = [];
      let complete = true;
      for (let index = 0; index < pairs.length; index++) {
        const suggestion = parseRecipeLine(lines[index]);
        const pair = pairs[index];
        if (
          !suggestion ||
          suggestion.ingredient1 !== pair.ingredient1 ||
          suggestion.ingredient2 !== pair.ingredient2 ||
          !isValidRecipeResult(suggestion.result)
        ) {
          complete = false;
          break;
        }
        suggestions.push({
          ingredient1: pair.ingredient1,
          ingredient2: pair.ingredient2,
          result: capitalizeElementName(suggestion.result),
        });
      }

      if (complete && suggestions.length === pairs.length) {
        return suggestions;
      }
    }

    throw new Error(
      `Failed to generate results for all ${pairs.length} requested pairs after ${MAX_GENERATION_RETRIES} attempts`,
    );
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
  maxTokens?: number,
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
        ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
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
      const prompt = `Generate an SVG illustration of "${args.elementName}" in a slightly cartoony style on a transparent background. The SVG should fit nicely inside a square frame. ${SVG_TEXT_POLICY} ${SVG_COMPLEXITY_POLICY} Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return one complete SVG only, without markdown or explanations.`;

      const { content, usage } = await callOpenRouter(
        prompt,
        MODEL_SVG,
        "low",
        SVG_MAX_COMPLETION_TOKENS,
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

Please generate an improved version of this SVG based on the feedback. Keep it in a slightly cartoony style on a transparent background, and ensure it fits nicely inside a square frame. ${SVG_TEXT_POLICY} ${SVG_COMPLEXITY_POLICY} Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return one complete SVG only, without markdown or explanations.`;

      const { content, usage } = await callOpenRouter(
        prompt,
        MODEL_SVG,
        "low",
        SVG_MAX_COMPLETION_TOKENS,
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
