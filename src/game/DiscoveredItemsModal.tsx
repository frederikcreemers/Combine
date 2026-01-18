import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

type DiscoveredItemsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function DiscoveredItemsModal({ isOpen, onClose }: DiscoveredItemsModalProps) {
  const discoveredElements = useQuery(api.game.listDiscoveredElements)

  if (!isOpen) return null

  return (
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">Your Discoveries</h2>
          <button
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1">
          <p class="text-sm text-gray-500 mb-4">
            You were the first player to make these items.
          </p>
          {discoveredElements === undefined ? (
            <div class="flex items-center justify-center py-8">
              <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : discoveredElements.length === 0 ? (
            <p class="text-center text-gray-400 py-8">
              You haven't discovered any new elements yet. Keep combining!
            </p>
          ) : (
            <div class="grid grid-cols-3 gap-3">
              {discoveredElements.map((element) => (
                <div
                  key={element._id}
                  class="bg-gray-50 rounded-lg p-3 flex flex-col items-center border border-gray-200"
                >
                  <div
                    class="w-12 h-12 mb-2"
                    dangerouslySetInnerHTML={{ __html: element.SVG }}
                  />
                  <span class="text-xs text-gray-700 text-center font-medium">
                    {element.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
