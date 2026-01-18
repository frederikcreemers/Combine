import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const generateSVG = internalAction({
  args: {
    elementName: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    const prompt = `Generate an SVG illustration of "${args.elementName}" in a simple illustration style on a transparent background. The SVG should fit nicely inside a square frame. Return only the SVG code, without any markdown formatting or explanations.`;

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
    const content = data.choices[0]?.message?.content || "";

    // Extract SVG from the response, handling markdown code blocks
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
  },
});
