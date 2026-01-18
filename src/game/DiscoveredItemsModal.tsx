import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Modal } from './Modal'

type DiscoveredItemsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function DiscoveredItemsModal({ isOpen, onClose }: DiscoveredItemsModalProps) {
  const discoveredElements = useQuery(api.game.listDiscoveredElements)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Discoveries" maxWidth="lg">
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
    </Modal>
  )
}
