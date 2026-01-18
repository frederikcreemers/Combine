import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function RecipeList() {
  const recipes = useQuery(api.admin.listRecipes);
  const elements = useQuery(api.elements.listElements);
  const deleteRecipe = useMutation(api.admin.deleteRecipe);

  const handleDelete = async (recipeId: Id<"recipes">, ingredient1Name: string, ingredient2Name: string, resultName: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete the recipe "${ingredient1Name} + ${ingredient2Name} = ${resultName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteRecipe({ recipeId });
    } catch (error) {
      console.error("Failed to delete recipe:", error);
      alert("Failed to delete recipe. Please try again.");
    }
  };

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

            {/* Action buttons */}
            <div class="ml-auto flex gap-2">
              <a
                href={`/admin/recipes/${recipe._id}`}
                class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
              >
                Edit
              </a>
              <button
                onClick={() => handleDelete(recipe._id, ingredient1.name, ingredient2.name, result.name)}
                class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
