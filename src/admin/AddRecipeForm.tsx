import { useState } from 'preact/hooks'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function AddRecipeForm() {
  const [ingredient1, setIngredient1] = useState<Id<'elements'> | ''>('')
  const [ingredient2, setIngredient2] = useState<Id<'elements'> | ''>('')
  const [result, setResult] = useState<Id<'elements'> | 'NEW_ELEMENT'>('')
  const [newElementName, setNewElementName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const addRecipe = useMutation(api.recipes.addRecipe)
  const addElement = useAction(api.elements.addElement)
  const elements = useQuery(api.elements.listElements)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!ingredient1 || !ingredient2 || !result) {
      return
    }
    if (result === 'NEW_ELEMENT') {
      if (!newElementName.trim()) {
        alert('Please enter a name for the new element')
        return
      }
    }
    setIsLoading(true)
    try {
      let resultElementId: Id<'elements'>
      
      if (result === 'NEW_ELEMENT') {
        // Create new element first
        const newElement = await addElement({
          name: newElementName.trim(),
          SVG: '',
        })
        resultElementId = newElement.id as Id<'elements'>
      } else {
        resultElementId = result as Id<'elements'>
      }

      await addRecipe({
        ingredient1: ingredient1 as Id<'elements'>,
        ingredient2: ingredient2 as Id<'elements'>,
        result: resultElementId,
      })
      setIngredient1('')
      setIngredient2('')
      setResult('')
      setNewElementName('')
    } catch (error) {
      console.error('Failed to add recipe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (elements === undefined) {
    return <div>Loading elements...</div>
  }

  return (
    <form onSubmit={handleSubmit} class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-900">Add New Recipe</h2>
      <div class="space-y-4">
        <div>
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
            {elements.map((element) => (
              <option key={element._id} value={element._id}>
                {element.name}
              </option>
            ))}
          </select>
        </div>
        <div>
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
            {elements.map((element) => (
              <option key={element._id} value={element._id}>
                {element.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label for="result" class="block text-sm font-medium text-gray-700 mb-1">
            Result
          </label>
          <select
            id="result"
            value={result}
            onChange={(e) => {
              const value = (e.target as HTMLSelectElement).value
              setResult(value as Id<'elements'> | 'NEW_ELEMENT')
            }}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an element</option>
            <option value="NEW_ELEMENT">NEW ELEMENT</option>
            {elements.map((element) => (
              <option key={element._id} value={element._id}>
                {element.name}
              </option>
            ))}
          </select>
        </div>
        {result === 'NEW_ELEMENT' && (
          <div>
            <label for="new-element-name" class="block text-sm font-medium text-gray-700 mb-1">
              New Element Name
            </label>
            <input
              id="new-element-name"
              type="text"
              value={newElementName}
              onInput={(e) => setNewElementName((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter name for new element"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoading ? 'Adding...' : 'Add Recipe'}
        </button>
      </div>
    </form>
  )
}
