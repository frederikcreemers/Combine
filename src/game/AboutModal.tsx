type AboutModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
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
          <h2 class="text-xl font-semibold text-gray-900">About Combine</h2>
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
        <div class="p-4 overflow-y-auto flex-1 space-y-4 text-gray-700">
          <p>
            <strong>Combine</strong> is a game where you combine elements to create new ones. 
            When a combination doesn't exist yet, AI generates a new recipe for you!
          </p>
          
          <p>
            This game was inspired by{' '}
            <a 
              href="https://neal.fun/infinite-craft/" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
            >
              Infinite Craft
            </a>
            , created by{' '}
            <a 
              href="https://neal.fun/" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
            >
              Neal Agarwal
            </a>
            . I wanted to see if I could generate better results with newer AI models, 
            and generate my own icons for elements.
          </p>
          
          <p>
            Infinite Craft was in turn inspired by the{' '}
            <a 
              href="https://littlealchemy2.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
            >
              Little Alchemy
            </a>
            {' '}series of games, which had a fixed set of elements and recipes.
          </p>

          <div class="pt-2 border-t border-gray-200">
            <p class="text-sm text-gray-500">
              Built by{' '}
              <a 
                href="https://frederikcreemers.be" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline"
              >
                Frederik Creemers
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
