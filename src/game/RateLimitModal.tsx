import { Modal } from './Modal'

type RateLimitModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function RateLimitModal({ isOpen, onClose }: RateLimitModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Limit Reached">
      <div class="space-y-4">
        <p class="text-gray-700">
          You've reached your daily limit for discovering new recipes.
        </p>
        <p class="text-gray-700">
          This is a hobby project, and I'm trying to keep AI API costs under control. 
          Your limit will reset at midnight UTC.
        </p>
        <p class="text-gray-700">
          If there's enough demand, I'm considering adding an option to pay for extra quota.
        </p>
        <div class="pt-2 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            Got feedback or want to let me know you'd pay for more?{' '}
            <a
              href="https://bsky.app/profile/bigblind.me"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
            >
              Reach out on Bluesky
            </a>
          </p>
        </div>
      </div>
    </Modal>
  )
}
