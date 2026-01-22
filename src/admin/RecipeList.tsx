import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RecipeItem } from "./RecipeItem";

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

  const elementsMap = new Map(elements.map((el) => [el._id, el]));

  return (
    <div class="space-y-4">
      {recipes.map((recipe) => (
        <RecipeItem
          key={recipe._id}
          recipe={recipe}
          elementsMap={elementsMap}
          showActions
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
