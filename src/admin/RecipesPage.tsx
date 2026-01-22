import { AddRecipeForm } from './AddRecipeForm'
import { RecipeSuggester } from './RecipeSuggester'
import { RecipeList } from './RecipeList'

export function RecipesPage() {
  return (
    <>
      <AddRecipeForm />
      <RecipeSuggester />
      <RecipeList />
    </>
  )
}
