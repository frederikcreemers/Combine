import { Modal } from "./Modal";

type RateLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RateLimitModal({ isOpen, onClose }: RateLimitModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Out of Energy">
      <div class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">
          You've used all of today's Energy, so you can't discover new recipes
          right now.
        </p>
        <p class="text-gray-700 dark:text-gray-300">
          You start each day with 30 Energy. Discovering a new recipe for an
          existing element costs 1 Energy; discovering a completely new element
          costs 5. Energy resets at midnight UTC.
        </p>
        <p class="text-gray-700 dark:text-gray-300">
          This is a hobby project, and Energy helps keep AI API costs under
          control. If there's enough demand, I'm considering adding an option to
          pay for extra Energy.
        </p>
        <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Got feedback or want to let me know you'd pay for more?{" "}
            <a
              href="https://bsky.app/profile/bigblind.me"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reach out on Bluesky
            </a>
          </p>
        </div>
      </div>
    </Modal>
  );
}
