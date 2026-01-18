import { useState } from "preact/hooks";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useLocation } from "preact-iso/router";

interface ElementPageProps {
  id: string;
}

export function ElementPage({ id }: ElementPageProps) {
  const elementId = id as Id<"elements">;
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSVG, setEditSVG] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const element = useQuery(api.elements.getElement, { elementId });
  const recipesForElement = useQuery(api.recipes.getRecipesForElement, { elementId });
  const recipesUsingElement = useQuery(api.recipes.getRecipesUsingElement, { elementId });
  const allElements = useQuery(api.elements.listElements);
  const deleteElement = useMutation(api.elements.deleteElement);
  const updateElement = useMutation(api.elements.updateElement);

  const handleDelete = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete "${element?.name}"? This will also delete all recipes that use this element. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteElement({ elementId });
      location.route("/admin");
    } catch (error) {
      console.error("Failed to delete element:", error);
      alert("Failed to delete element. Please try again.");
    }
  };

  const handleEdit = () => {
    if (element) {
      setEditName(element.name);
      setEditSVG(element.SVG);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName("");
    setEditSVG("");
  };

  const handleSaveEdit = async (e: Event) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Element name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await updateElement({
        elementId,
        name: editName.trim(),
        SVG: editSVG.trim(),
      });
      setIsEditing(false);
      setEditName("");
      setEditSVG("");
    } catch (error) {
      console.error("Failed to update element:", error);
      alert("Failed to update element. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          {!isEditing ? (
            <div class="flex items-center justify-between">
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
              <div class="flex gap-2">
                <button
                  onClick={handleEdit}
                  class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Delete Element
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveEdit} class="space-y-4">
              <div class="flex items-start gap-6">
                <div class="w-32 h-32 border-2 border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                  <div
                    dangerouslySetInnerHTML={{ __html: editSVG || element.SVG }}
                    class="w-full h-full flex items-center justify-center"
                  />
                </div>
                <div class="flex-1 space-y-4">
                  <div>
                    <label for="edit-name" class="block text-sm font-medium text-gray-700 mb-1">
                      Element Name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter element name"
                    />
                  </div>
                  <div>
                    <label for="edit-svg" class="block text-sm font-medium text-gray-700 mb-1">
                      SVG Code
                    </label>
                    <textarea
                      id="edit-svg"
                      value={editSVG}
                      onInput={(e) => setEditSVG((e.target as HTMLTextAreaElement).value)}
                      rows={6}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Paste SVG code here"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
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
