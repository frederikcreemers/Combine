import { useState } from "preact/hooks";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useLocation } from "preact-iso/router";
import { RecipeItem } from "./RecipeItem";

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
  
  const element = useQuery(api.admin.getElement, { elementId });
  const recipesForElement = useQuery(api.admin.getRecipesForElement, { elementId });
  const recipesUsingElement = useQuery(api.admin.getRecipesUsingElement, { elementId });
  const allElements = useQuery(api.elements.listElements);
  const deleteElement = useMutation(api.admin.deleteElement);
  const deleteRecipe = useMutation(api.admin.deleteRecipe);
  const updateElement = useMutation(api.admin.updateElement);
  const regenerateSVG = useAction(api.admin.regenerateSVG);
  
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const renameElement = useAction(api.admin.renameElement);

  const handleDelete = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete "${element?.name}"? This will also delete all recipes that use this element. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteElement({ elementId });
      location.route("/admin/elements");
    } catch (error) {
      console.error("Failed to delete element:", error);
      alert("Failed to delete element. Please try again.");
    }
  };

  const handleDeleteRecipe = async (recipeId: Id<"recipes">, ingredient1Name: string, ingredient2Name: string, resultName: string) => {
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

  const handleRegenerateSVG = async (e: Event) => {
    e.preventDefault();
    if (!regenerateFeedback.trim()) {
      alert("Please provide feedback for regeneration");
      return;
    }

    setIsRegenerating(true);
    try {
      await regenerateSVG({
        elementId,
        feedback: regenerateFeedback.trim(),
      });
      setShowRegenerateForm(false);
      setRegenerateFeedback("");
    } catch (error) {
      console.error("Failed to regenerate SVG:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to regenerate SVG. Please try again.";
      alert(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRename = async (e: Event) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Please enter a new name");
      return;
    }

    setIsRenaming(true);
    try {
      await renameElement({
        elementId,
        newName: newName.trim(),
      });
      setShowRenameForm(false);
      setNewName("");
    } catch (error) {
      console.error("Failed to rename element:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to rename element. Please try again.";
      alert(errorMessage);
    } finally {
      setIsRenaming(false);
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
        <div class="mb-6">
          <a href="/admin/elements" class="text-blue-600 hover:underline">
            ← Back to Admin
          </a>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          {!isEditing ? (
            <>
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
                    onClick={() => {
                      setShowRenameForm(!showRenameForm);
                      setShowRegenerateForm(false);
                      if (!showRenameForm && element) {
                        setNewName(element.name);
                      }
                    }}
                    class="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setShowRegenerateForm(!showRegenerateForm);
                      setShowRenameForm(false);
                    }}
                    class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                  >
                    Regenerate SVG
                  </button>
                  <button
                    onClick={handleDelete}
                    class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Delete Element
                  </button>
                </div>
              </div>
              {showRenameForm && (
                <div class="mt-4 pt-4 border-t border-gray-200">
                  <form onSubmit={handleRename} class="space-y-4">
                    <div>
                      <label for="rename-input" class="block text-sm font-medium text-gray-700 mb-1">
                        New Name
                      </label>
                      <input
                        id="rename-input"
                        type="text"
                        value={newName}
                        onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Enter new element name"
                      />
                      <p class="mt-1 text-sm text-gray-500">
                        This will also generate a new SVG for the element.
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="submit"
                        disabled={isRenaming}
                        class="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRenaming ? "Renaming..." : "Rename"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRenameForm(false);
                          setNewName("");
                        }}
                        disabled={isRenaming}
                        class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {showRegenerateForm && (
                <div class="mt-4 pt-4 border-t border-gray-200">
                  <form onSubmit={handleRegenerateSVG} class="space-y-4">
                    <div>
                      <label for="regenerate-feedback" class="block text-sm font-medium text-gray-700 mb-1">
                        Feedback for SVG Regeneration
                      </label>
                      <textarea
                        id="regenerate-feedback"
                        value={regenerateFeedback}
                        onInput={(e) => setRegenerateFeedback((e.target as HTMLTextAreaElement).value)}
                        rows={3}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter feedback on how to improve the SVG (e.g., 'make it more colorful', 'add more details', 'simplify the design')"
                      />
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="submit"
                        disabled={isRegenerating}
                        class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegenerating ? "Regenerating..." : "Regenerate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRegenerateForm(false);
                          setRegenerateFeedback("");
                        }}
                        disabled={isRegenerating}
                        class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
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
                {recipesForElement.map((recipe) => (
                  <RecipeItem
                    key={recipe._id}
                    recipe={recipe}
                    elementsMap={elementsMap}
                    showActions
                    onDelete={handleDeleteRecipe}
                  />
                ))}
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
                {recipesUsingElement.map((recipe) => (
                  <RecipeItem
                    key={recipe._id}
                    recipe={recipe}
                    elementsMap={elementsMap}
                    showActions
                    onDelete={handleDeleteRecipe}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
