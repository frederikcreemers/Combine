import { useMemo, useState } from "preact/hooks";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Modal } from "../game/Modal";

type SuggestedRecipe = {
  ingredient1: string;
  ingredient2: string;
  result: string;
  // Crafting depth from the initial elements; only set for early-game suggestions
  pairTier?: number;
};

type ChangeMode = "existing" | "new";

export function RecipeSuggester() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Suggest Recipes");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [acceptedIndices, setAcceptedIndices] = useState<number[]>([]);
  const [acceptingIndices, setAcceptingIndices] = useState<number[]>([]);
  const [changingIndex, setChangingIndex] = useState<number | null>(null);
  const [changeMode, setChangeMode] = useState<ChangeMode>("existing");
  const [selectedElementName, setSelectedElementName] = useState("");
  const [newElementName, setNewElementName] = useState("");
  const [newElementDescription, setNewElementDescription] = useState("");
  const [elementFilter, setElementFilter] = useState("");

  const elements = useQuery(api.elements.listElements);
  const suggestRecipes = useAction(api.admin.suggestRecipes);
  const suggestEarlyGameRecipes = useAction(api.admin.suggestEarlyGameRecipes);
  const acceptSuggestedRecipe = useAction(api.admin.acceptSuggestedRecipe);

  const sortedElements = useMemo(() => {
    if (!elements) return [];
    return [...elements].sort((a, b) => a.name.localeCompare(b.name));
  }, [elements]);

  const filteredElements = useMemo(() => {
    const query = elementFilter.trim().toLowerCase();
    if (!query) return sortedElements;
    return sortedElements.filter((element) =>
      element.name.toLowerCase().includes(query)
    );
  }, [sortedElements, elementFilter]);

  const changingRecipe =
    changingIndex !== null ? suggestedRecipes[changingIndex] : null;

  const runSuggester = async (
    title: string,
    suggest: () => Promise<SuggestedRecipe[]>
  ) => {
    setModalTitle(title);
    setIsOpen(true);
    setIsLoading(true);
    setSuggestedRecipes([]);
    setAcceptedIndices([]);
    setAcceptingIndices([]);
    closeChangeForm();
    try {
      setSuggestedRecipes(await suggest());
    } catch (e: any) {
      console.error("Failed to suggest recipes:", e);
      alert("Failed to suggest recipes.\n" + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeChangeForm = () => {
    setChangingIndex(null);
    setChangeMode("existing");
    setSelectedElementName("");
    setNewElementName("");
    setNewElementDescription("");
    setElementFilter("");
  };

  const openChangeForm = (index: number) => {
    const recipe = suggestedRecipes[index];
    setChangingIndex(index);
    setChangeMode("existing");
    setSelectedElementName(recipe.result);
    setNewElementName(recipe.result);
    setNewElementDescription("");
    setElementFilter("");
  };

  const handleAcceptRecipe = (
    index: number,
    overrides?: { result: string; description?: string }
  ) => {
    setAcceptingIndices((indices) => [...indices, index]);
    const recipe = suggestedRecipes[index];
    acceptSuggestedRecipe({
      ingredient1: recipe.ingredient1,
      ingredient2: recipe.ingredient2,
      result: overrides?.result ?? recipe.result,
      description: overrides?.description,
    })
      .then(() => {
        setAcceptedIndices((indices) => [...indices, index]);
        if (changingIndex === index) {
          closeChangeForm();
        }
      })
      .catch((e) => {
        console.error("Failed to accept recipe:", e);
        alert("Failed to accept recipe.\n" + e.message);
      })
      .finally(() => {
        setAcceptingIndices((indices) => indices.filter((i) => i !== index));
      });
  };

  const handleConfirmChange = () => {
    if (changingIndex === null) return;

    if (changeMode === "existing") {
      if (!selectedElementName) {
        alert("Please select an existing element");
        return;
      }
      handleAcceptRecipe(changingIndex, { result: selectedElementName });
      return;
    }

    const name = newElementName.trim();
    if (!name) {
      alert("Please enter a name for the new element");
      return;
    }
    const description = newElementDescription.trim();
    handleAcceptRecipe(changingIndex, {
      result: name,
      description: description || undefined,
    });
  };

  const handleCloseSuggestions = () => {
    if (changingIndex !== null) {
      closeChangeForm();
      return;
    }
    setIsOpen(false);
  };

  return (
    <div class="flex gap-2">
      <button
        class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => runSuggester("Suggest Recipes", () => suggestRecipes())}
      >
        Suggest Recipes
      </button>
      <button
        class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Suggests recipes for the missing combinations closest to the starting elements, so early players don't hit dead ends"
        onClick={() =>
          runSuggester("Suggest Early-Game Recipes", () => suggestEarlyGameRecipes())
        }
      >
        Suggest Early-Game Recipes
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleCloseSuggestions}
        title={modalTitle}
        maxWidth="md"
      >
        <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
          {isLoading && <div>Loading...</div>}
          {!isLoading && suggestedRecipes.length === 0 && (
            <div>No suggestions.</div>
          )}
          {suggestedRecipes.map((recipe, index) => (
            <div
              key={`${recipe.ingredient1}-${recipe.ingredient2}-${recipe.result}-${index}`}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                {recipe.ingredient1} + {recipe.ingredient2} = {recipe.result}
              </div>
              {recipe.pairTier !== undefined && (
                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                  tier {recipe.pairTier}
                </span>
              )}
              {acceptedIndices.includes(index) ? (
                <div className="text-green-500">✅</div>
              ) : acceptingIndices.includes(index) ? (
                <div className="">⏳</div>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm"
                    onClick={() => handleAcceptRecipe(index)}
                  >
                    Accept
                  </button>
                  <button
                    className="bg-amber-500 text-white px-3 py-1 rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors text-sm"
                    onClick={() => openChangeForm(index)}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={changingRecipe !== null}
        onClose={closeChangeForm}
        title={
          changingRecipe
            ? `Change result for ${changingRecipe.ingredient1} + ${changingRecipe.ingredient2}`
            : "Change result"
        }
        maxWidth="md"
      >
        {changingRecipe && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Suggested: <span className="font-medium">{changingRecipe.result}</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md text-sm border transition-colors ${
                  changeMode === "existing"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setChangeMode("existing")}
              >
                Existing element
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md text-sm border transition-colors ${
                  changeMode === "new"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setChangeMode("new")}
              >
                New element
              </button>
            </div>

            {changeMode === "existing" ? (
              <div className="space-y-3">
                <div>
                  <label
                    for="change-element-filter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Filter
                  </label>
                  <input
                    id="change-element-filter"
                    type="text"
                    value={elementFilter}
                    onInput={(e) =>
                      setElementFilter((e.target as HTMLInputElement).value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search elements..."
                  />
                </div>
                <div>
                  <label
                    for="change-existing-element"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Result
                  </label>
                  <select
                    id="change-existing-element"
                    value={selectedElementName}
                    onChange={(e) =>
                      setSelectedElementName(
                        (e.target as HTMLSelectElement).value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={Math.min(12, Math.max(4, filteredElements.length))}
                  >
                    {filteredElements.length === 0 && (
                      <option value="" disabled>
                        No matching elements
                      </option>
                    )}
                    {filteredElements.map((element) => (
                      <option key={element._id} value={element.name}>
                        {element.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    for="change-new-element-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="change-new-element-name"
                    type="text"
                    value={newElementName}
                    onInput={(e) =>
                      setNewElementName((e.target as HTMLInputElement).value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter name for new element"
                  />
                </div>
                <div>
                  <label
                    for="change-new-element-description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description{" "}
                    <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    id="change-new-element-description"
                    value={newElementDescription}
                    onInput={(e) =>
                      setNewElementDescription(
                        (e.target as HTMLTextAreaElement).value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave blank to auto-generate"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={closeChangeForm}
                disabled={
                  changingIndex !== null &&
                  acceptingIndices.includes(changingIndex)
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirmChange}
                disabled={
                  changingIndex !== null &&
                  acceptingIndices.includes(changingIndex)
                }
              >
                {changingIndex !== null &&
                acceptingIndices.includes(changingIndex)
                  ? "Adding..."
                  : "Add"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
