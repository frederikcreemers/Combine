import { useState, useEffect, useMemo } from 'preact/hooks'
import { useQuery, useMutation } from 'convex/react'
import { useLocation } from 'preact-iso/router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function EditRecipePage({ id }: { id: string }) {
  const location = useLocation()
  const recipeId = id as Id<'recipes'>
  const recipe = useQuery(api.admin.getRecipe, { recipeId })
  const elements = useQuery(api.elements.listElements)
  const updateRecipe = useMutation(api.admin.updateRecipe)

  const [ingredient1, setIngredient1] = useState<Id<'elements'> | ''>('')
  const [ingredient2, setIngredient2] = useState<Id<'elements'> | ''>('')
  const [result, setResult] = useState<Id<'elements'> | ''>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (recipe) {
      setIngredient1(recipe.ingredient1)
      setIngredient2(recipe.ingredient2)
      setResult(recipe.result)
    }
  }, [recipe])

  const sortedElements = useMemo(() => {
    if (!elements) return []
    return [...elements].sort((a, b) => a.name.localeCompare(b.name))
  }, [elements])

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!ingredient1 || !ingredient2 || !result) {
      alert('Please select all fields')
      return
    }

    setIsLoading(true)
    try {
      await updateRecipe({
        recipeId,
        ingredient1: ingredient1 as Id<'elements'>,
        ingredient2: ingredient2 as Id<'elements'>,
        result: result as Id<'elements'>,
      })
      location.route('/admin/recipes')
    } catch (error) {
      console.error('Failed to update recipe:', error)
      alert('Failed to update recipe. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (recipe === undefined || elements === undefined) {
    return (
      <div class="min-h-screen bg-gray-100 p-8">
        <div class="max-w-2xl mx-auto">
          <p class="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (recipe === null) {
    return (
      <div class="min-h-screen bg-gray-100 p-8">
        <div class="max-w-2xl mx-auto">
          <p class="text-red-500">Recipe not found</p>
          <a href="/admin/recipes" class="text-blue-600 hover:underline mt-4 inline-block">
            Back to Admin
          </a>
        </div>
      </div>
    )
  }

  return (
    <div class="min-h-screen bg-gray-100 p-8">
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <a href="/admin/recipes" class="text-blue-600 hover:underline">
            ← Back to Admin
          </a>
        </div>

        <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Recipe</h1>

        <form onSubmit={handleSubmit} class="bg-white p-6 rounded-lg shadow-md">
          <div class="mb-4">
            <label for="ingredient1" class="block text-sm font-medium text-gray-700 mb-1">
              Ingredient 1
            </label>
            <select
              id="ingredient1"
              value={ingredient1}
              onChange={(e) => setIngredient1((e.target as HTMLSelectElement).value as Id<'elements'>)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an element</option>
              {sortedElements.map((element) => (
                <option key={element._id} value={element._id}>
                  {element.name}
                </option>
              ))}
            </select>
          </div>

          <div class="mb-4">
            <label for="ingredient2" class="block text-sm font-medium text-gray-700 mb-1">
              Ingredient 2
            </label>
            <select
              id="ingredient2"
              value={ingredient2}
              onChange={(e) => setIngredient2((e.target as HTMLSelectElement).value as Id<'elements'>)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an element</option>
              {sortedElements.map((element) => (
                <option key={element._id} value={element._id}>
                  {element.name}
                </option>
              ))}
            </select>
          </div>

          <div class="mb-6">
            <label for="result" class="block text-sm font-medium text-gray-700 mb-1">
              Result
            </label>
            <select
              id="result"
              value={result}
              onChange={(e) => setResult((e.target as HTMLSelectElement).value as Id<'elements'>)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an element</option>
              {sortedElements.map((element) => (
                <option key={element._id} value={element._id}>
                  {element.name}
                </option>
              ))}
            </select>
          </div>

          <div class="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <a
              href="/admin/recipes"
              class="flex-1 text-center bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
