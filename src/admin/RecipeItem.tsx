import type { Id } from "../../convex/_generated/dataModel";
import { ElementSvg } from "../components/ElementSvg";
import type { ElementView } from "../types";

interface Recipe {
  _id: Id<"recipes">
  ingredient1: Id<"elements">
  ingredient2: Id<"elements">
  result: Id<"elements">
}

interface RecipeItemProps {
  recipe: Recipe
  elementsMap: Map<string, ElementView>
  showActions?: boolean
  onDelete?: (recipeId: Id<"recipes">, ingredient1Name: string, ingredient2Name: string, resultName: string) => void
}

export function RecipeItem({ recipe, elementsMap, showActions = false, onDelete }: RecipeItemProps) {
  const ingredient1 = elementsMap.get(recipe.ingredient1);
  const ingredient2 = elementsMap.get(recipe.ingredient2);
  const result = elementsMap.get(recipe.result);

  if (!ingredient1 || !ingredient2 || !result) {
    return null;
  }

  return (
    <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2">
      {/* Ingredient 1 */}
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
          <ElementSvg name={ingredient1.name} svgUrl={ingredient1.svgUrl} legacySvg={ingredient1.SVG} class="w-full h-full" />
        </div>
        <span class="text-sm text-gray-700">{ingredient1.name}</span>
      </div>

      {/* Plus sign */}
      <span class="text-gray-400">+</span>

      {/* Ingredient 2 */}
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
          <ElementSvg name={ingredient2.name} svgUrl={ingredient2.svgUrl} legacySvg={ingredient2.SVG} class="w-full h-full" />
        </div>
        <span class="text-sm text-gray-700">{ingredient2.name}</span>
      </div>

      {/* Equals sign */}
      <span class="text-gray-400">=</span>

      {/* Result */}
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 border-2 border-blue-500 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
          <ElementSvg name={result.name} svgUrl={result.svgUrl} legacySvg={result.SVG} class="w-full h-full" />
        </div>
        <span class="text-sm font-semibold text-gray-900">{result.name}</span>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div class="ml-auto flex gap-2">
          <a
            href={`/admin/recipes/${recipe._id}`}
            class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
          >
            Edit
          </a>
          <button
            onClick={() => onDelete?.(recipe._id, ingredient1.name, ingredient2.name, result.name)}
            class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
