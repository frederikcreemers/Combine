import { useState } from "preact/hooks";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Modal } from "../game/Modal";

export function RecipeSuggester() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<{ ingredient1: string; ingredient2: string; result: string }[]>([]);
  const [acceptedIndices, setAcceptedIndices] = useState<number[]>([]);
  const [acceptingIndices, setAcceptingIndices] = useState<number[]>([]);
  const suggestRecipes = useAction(api.admin.suggestRecipes);
  const acceptSuggestedRecipe = useAction(api.admin.acceptSuggestedRecipe);

  const handleSuggestRecipes = async () => {
    setIsOpen(true);
    setIsLoading(true);
    const suggestedRecipes = await suggestRecipes();
    setSuggestedRecipes(suggestedRecipes);
    setIsLoading(false);
  };

  const handleAcceptRecipe = (index: number) => {
    setAcceptingIndices([...acceptingIndices, index]);
    const recipe = suggestedRecipes[index];
    acceptSuggestedRecipe({
      ingredient1: recipe.ingredient1,
      ingredient2: recipe.ingredient2,
      result: recipe.result,
    }).then(() => {
      setAcceptingIndices(acceptingIndices.filter((i) => i !== index));
      setAcceptedIndices([...acceptedIndices, index]);
    }).catch((e) => {
        console.error("Failed to accept recipe:", e);
        alert("Failed to accept recipe.\n" + e.message);
      }).finally(() => {
        setAcceptingIndices(acceptingIndices.filter((i) => i !== index));
    });
  };

  return (
    <div>
      <button
            class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleSuggestRecipes()}
      >
            Suggest Recipes
      </button>
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Suggest Recipes" maxWidth="md">
        <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
          {isLoading && <div>Loading...</div>}
          {suggestedRecipes.map((recipe, index) => (
            <div key={`${recipe.ingredient1}-${recipe.ingredient2}-${recipe.result}`} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
              <div>{recipe.ingredient1} + {recipe.ingredient2} = {recipe.result}</div>
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