import { useState } from 'preact/hooks'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function AddElementForm() {
  const [name, setName] = useState('')
  const [svg, setSvg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const addElement = useAction(api.admin.addElement)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!name.trim()) {
      return
    }
    setIsLoading(true)
    try {
      await addElement({ name: name.trim(), SVG: svg.trim() })
      setName('')
      setSvg('')
    } catch (error) {
      console.error('Failed to add element:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-900">Add New Element</h2>
      <div class="space-y-4">
        <div>
          <label for="element-name" class="block text-sm font-medium text-gray-700 mb-1">
            Element Name
          </label>
          <input
            id="element-name"
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter element name"
          />
        </div>
        <div>
          <label for="element-svg" class="block text-sm font-medium text-gray-700 mb-1">
            SVG Code
          </label>
          <textarea
            id="element-svg"
            value={svg}
            onInput={(e) => setSvg((e.target as HTMLTextAreaElement).value)}
            rows={6}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Paste SVG code here"
          />
        </div>
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
          {isLoading ? 'Adding...' : 'Add Element'}
        </button>
      </div>
    </form>
  )
}
