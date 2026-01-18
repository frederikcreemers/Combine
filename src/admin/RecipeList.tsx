import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function RecipeList() {
  const recipes = useQuery(api.recipes.listRecipes);
  const elements = useQuery(api.elements.listElements);

  if (recipes === undefined || elements === undefined) {
    return <div>Loading...</div>;
  }

  // Create a map of element IDs to element data for quick lookup
  const elementsMap = new Map(elements.map((el) => [el._id, el]));

  return (
    <div class="space-y-4">
      {recipes.map((recipe) => {
        const ingredient1 = elementsMap.get(recipe.ingredient1);
        const ingredient2 = elementsMap.get(recipe.ingredient2);
        const result = elementsMap.get(recipe.result);

        if (!ingredient1 || !ingredient2 || !result) {
          return null;
        }

        return (
          <div
            key={recipe._id}
            class="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4"
          >
            {/* Ingredient 1 */}
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                <div
                  dangerouslySetInnerHTML={{ __html: ingredient1.SVG }}
                  class="w-full h-full flex items-center justify-center"
                />
              </div>
              <div class="text-sm text-gray-700">{ingredient1.name}</div>
            </div>

            {/* Plus sign */}
            <div class="text-xl text-gray-400 font-bold">+</div>

            {/* Ingredient 2 */}
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                <div
                  dangerouslySetInnerHTML={{ __html: ingredient2.SVG }}
                  class="w-full h-full flex items-center justify-center"
                />
              </div>
              <div class="text-sm text-gray-700">{ingredient2.name}</div>
            </div>

            {/* Equals sign */}
            <div class="text-xl text-gray-400 font-bold">=</div>

            {/* Result */}
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 border-2 border-blue-500 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                <div
                  dangerouslySetInnerHTML={{ __html: result.SVG }}
                  class="w-full h-full flex items-center justify-center"
                />
              </div>
              <div class="text-sm font-semibold text-gray-900">{result.name}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
