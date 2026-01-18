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

export async function generateRecipe(
  ingredient1Name: string,
  ingredient2Name: string,
  recipeExamples: string
): Promise<string> {
  const prompt = `You are a recipe generator for a game where elements can be combined.

Existing recipes (examples):
${recipeExamples || "None yet"}

Given two elements to combine: "${ingredient1Name}" and "${ingredient2Name}"

Determine what the result should be. You can:
1. Reuse an existing element name if it makes sense (based on the examples above)
2. Create a new element name if needed
3. Respond with "NO RESULT" if these elements should not be combinable

IMPORTANT: Reply with ONLY the result element name (or "NO RESULT"), nothing else. No explanations, no markdown, just the name.`;

  return await callOpenRouter(prompt);
}

async function callOpenRouter(prompt: string): Promise<string> {
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
      model: "google/gemini-3-flash-preview",
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
  handler: async (ctx, args) => {
    const prompt = `Generate an SVG illustration of "${args.elementName}" in a simple illustration style on a transparent background. The SVG should fit nicely inside a square frame. Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return only the SVG code, without any markdown formatting or explanations.`;

    const content = await callOpenRouter(prompt);
    return extractSVG(content);
  },
});

export const regenerateSVG = internalAction({
  args: {
    elementName: v.string(),
    oldSVG: v.string(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = `You are updating an SVG illustration of "${args.elementName}". Here is the current SVG:

${args.oldSVG}

User feedback: ${args.feedback}

Please generate an improved version of this SVG based on the feedback. Keep it in a simple illustration style on a transparent background, and ensure it fits nicely inside a square frame. Do not set explicit width or height attributes on the SVG element - use only viewBox for sizing. Return only the SVG code, without any markdown formatting or explanations.`;

    const content = await callOpenRouter(prompt);
    return extractSVG(content);
  },
});
