import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function ElementCollection() {
  const unlockedElements = useQuery(api.game.listUnlockedElements)

  if (unlockedElements === undefined) {
    return (
      <div class="w-[15%] min-w-[200px] bg-white border-l border-gray-300 p-4">
        <p class="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div class="w-[15%] min-w-[200px] bg-white border-l border-gray-300 p-4 overflow-y-auto">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Elements</h2>
      <div class="space-y-2">
        {unlockedElements.map((element) => (
          <div
            key={element._id}
            class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
          >
            <div
              class="w-8 h-8 flex-shrink-0"
              dangerouslySetInnerHTML={{ __html: element.SVG }}
            />
            <span class="text-sm text-gray-700 truncate">{element.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
