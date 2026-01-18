import { useState } from 'preact/hooks'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function AddElementForm() {
  const [name, setName] = useState('')
  const [svg, setSvg] = useState('')
  const addElement = useAction(api.elements.addElement)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!name.trim()) {
      return
    }
    try {
      await addElement({ name: name.trim(), SVG: svg.trim() })
      setName('')
      setSvg('')
    } catch (error) {
      console.error('Failed to add element:', error)
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
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Add Element
        </button>
      </div>
    </form>
  )
}
