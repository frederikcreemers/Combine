import { Modal } from './Modal'

type AboutModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Combine" maxWidth="lg">
      <div class="space-y-4 text-gray-700">
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
    </Modal>
  )
}
