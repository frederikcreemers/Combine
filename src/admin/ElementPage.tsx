import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ElementPageProps {
  id: string;
}

export function ElementPage({ id }: ElementPageProps) {
  const elementId = id as Id<"elements">;
  
  const element = useQuery(api.elements.getElement, { elementId });
  const recipesForElement = useQuery(api.recipes.getRecipesForElement, { elementId });
  const recipesUsingElement = useQuery(api.recipes.getRecipesUsingElement, { elementId });
  const allElements = useQuery(api.elements.listElements);

  if (element === undefined || recipesForElement === undefined || recipesUsingElement === undefined || allElements === undefined) {
    return <div>Loading...</div>;
  }

  if (!element) {
    return <div>Element not found</div>;
  }

  const elementsMap = new Map(allElements.map((el) => [el._id, el]));

  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <div class="flex items-center gap-6">
            <div class="w-32 h-32 border-2 border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
              <div
                dangerouslySetInnerHTML={{ __html: element.SVG }}
                class="w-full h-full flex items-center justify-center"
              />
            </div>
            <div>
              <h1 class="text-4xl font-bold text-gray-900 mb-2">{element.name}</h1>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recipes for creating this element */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold mb-4 text-gray-900">Recipes to Create</h2>
            {recipesForElement.length === 0 ? (
              <p class="text-gray-500">No recipes found to create this element.</p>
            ) : (
              <div class="space-y-3">
                {recipesForElement.map((recipe) => {
                  const ingredient1 = elementsMap.get(recipe.ingredient1);
                  const ingredient2 = elementsMap.get(recipe.ingredient2);
                  if (!ingredient1 || !ingredient2) return null;

                  return (
                    <div
                      key={recipe._id}
                      class="border border-gray-200 rounded-lg p-3 flex items-center gap-2"
                    >
                      <div class="flex items-center gap-1">
                        <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                          <div
                            dangerouslySetInnerHTML={{ __html: ingredient1.SVG }}
                            class="w-full h-full flex items-center justify-center"
                          />
                        </div>
                        <span class="text-sm text-gray-700">{ingredient1.name}</span>
                      </div>
                      <span class="text-gray-400">+</span>
                      <div class="flex items-center gap-1">
                        <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                          <div
                            dangerouslySetInnerHTML={{ __html: ingredient2.SVG }}
                            class="w-full h-full flex items-center justify-center"
                          />
                        </div>
                        <span class="text-sm text-gray-700">{ingredient2.name}</span>
                      </div>
                      <span class="text-gray-400">=</span>
                      <div class="flex items-center gap-1">
                        <div class="w-5 h-5 border-2 border-blue-500 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                          <div
                            dangerouslySetInnerHTML={{ __html: element.SVG }}
                            class="w-full h-full flex items-center justify-center"
                          />
                        </div>
                        <span class="text-sm font-semibold text-gray-900">{element.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recipes using this element as ingredient */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold mb-4 text-gray-900">Recipes Using This Element</h2>
            {recipesUsingElement.length === 0 ? (
              <p class="text-gray-500">This element is not used in any recipes.</p>
            ) : (
              <div class="space-y-3">
                {recipesUsingElement.map((recipe) => {
                  const ingredient1 = elementsMap.get(recipe.ingredient1);
                  const ingredient2 = elementsMap.get(recipe.ingredient2);
                  const result = elementsMap.get(recipe.result);
                  if (!ingredient1 || !ingredient2 || !result) return null;

                  return (
                    <div
                      key={recipe._id}
                      class="border border-gray-200 rounded-lg p-3 flex items-center gap-2"
                    >
                      <div class="flex items-center gap-1">
                        <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                          <div
                            dangerouslySetInnerHTML={{ __html: ingredient1.SVG }}
                            class="w-full h-full flex items-center justify-center"
                          />
                        </div>
                        <span class="text-sm text-gray-700">{ingredient1.name}</span>
                      </div>
                      <span class="text-gray-400">+</span>
                      <div class="flex items-center gap-1">
                        <div class="w-5 h-5 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                          <div
                            dangerouslySetInnerHTML={{ __html: ingredient2.SVG }}
                            class="w-full h-full flex items-center justify-center"
                          />
                        </div>
                        <span class="text-sm text-gray-700">{ingredient2.name}</span>
                      </div>
                      <span class="text-gray-400">=</span>
                      <div class="flex items-center gap-1">
                        <div class="w-5 h-5 border-2 border-blue-500 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                          <div
                            dangerouslySetInnerHTML={{ __html: result.SVG }}
                            class="w-full h-full flex items-center justify-center"
                          />
                        </div>
                        <span class="text-sm font-semibold text-gray-900">{result.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
