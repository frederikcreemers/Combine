import { useState } from "preact/hooks";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Modal } from "../game/Modal";

type SuggestedRecipe = {
  ingredient1: string;
  ingredient2: string;
  result: string;
  // Crafting depth from the initial elements; only set for early-game suggestions
  pairTier?: number;
};

export function RecipeSuggester() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Suggest Recipes");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [acceptedIndices, setAcceptedIndices] = useState<number[]>([]);
  const [acceptingIndices, setAcceptingIndices] = useState<number[]>([]);
  const suggestRecipes = useAction(api.admin.suggestRecipes);
  const suggestEarlyGameRecipes = useAction(api.admin.suggestEarlyGameRecipes);

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
    try {
      setSuggestedRecipes(await suggest());
    } catch (e: any) {
      console.error("Failed to suggest recipes:", e);
      alert("Failed to suggest recipes.\n" + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptSuggestedRecipe = useAction(api.admin.acceptSuggestedRecipe);

  const handleAcceptRecipe = (index: number) => {
    setAcceptingIndices((indices) => [...indices, index]);
    const recipe = suggestedRecipes[index];
    acceptSuggestedRecipe({
      ingredient1: recipe.ingredient1,
      ingredient2: recipe.ingredient2,
      result: recipe.result,
    }).then(() => {
      setAcceptedIndices((indices) => [...indices, index]);
    }).catch((e) => {
      console.error("Failed to accept recipe:", e);
      alert("Failed to accept recipe.\n" + e.message);
    }).finally(() => {
      setAcceptingIndices((indices) => indices.filter((i) => i !== index));
    });
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={modalTitle} maxWidth="md">
        <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
          {isLoading && <div>Loading...</div>}
          {!isLoading && suggestedRecipes.length === 0 && (
            <div>No suggestions.</div>
          )}
          {suggestedRecipes.map((recipe, index) => (
            <div key={`${recipe.ingredient1}-${recipe.ingredient2}-${recipe.result}`} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
              <div className="flex-1">
                {recipe.ingredient1} + {recipe.ingredient2} = {recipe.result}
              </div>
              {recipe.pairTier !== undefined && (
                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                  tier {recipe.pairTier}
                </span>
              )}
              {acceptedIndices.includes(index) ?
                <div className="text-green-500">✅</div> :
                acceptingIndices.includes(index) ?
                <div className="">⏳</div> :
                <button className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-sm"
                  onClick={() => handleAcceptRecipe(index)}>
                    Accept
                </button>
              }
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
