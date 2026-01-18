import { useState } from 'preact/hooks'
import { useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Modal } from './Modal'

type AccountModalProps = {
  isOpen: boolean
  onClose: () => void
  onLoginClick: () => void
}

export function AccountModal({ isOpen, onClose, onLoginClick }: AccountModalProps) {
  const currentUser = useQuery(api.users.getCurrentUser)
  const clearProgress = useMutation(api.game.clearProgress)
  const { signOut } = useAuthActions()
  const [isClearing, setIsClearing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      window.location.reload()
    } catch (error) {
      console.error('Failed to sign out:', error)
      setIsLoggingOut(false)
    }
  }

  const handleClearProgress = async () => {
    const confirmed = confirm(
      'Are you sure you want to clear your progress? This will remove all discovered elements except the starting ones. This cannot be undone.'
    )
    if (!confirmed) return

    setIsClearing(true)
    try {
      await clearProgress()
      onClose()
    } catch (error) {
      console.error('Failed to clear progress:', error)
      alert('Failed to clear progress. Please try again.')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account">
      <div class="space-y-4">
        {currentUser?.anonymous ? (
          <div>
            <button
              onClick={onLoginClick}
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Sign in with Email
            </button>
            <p class="text-sm text-gray-500 mt-2">
              Sign in to save your progress across devices.
            </p>
          </div>
        ) : currentUser ? (
          <div>
            <p class="text-sm text-gray-700 mb-2">
              Signed in as <strong>{currentUser.email}</strong>
            </p>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        ) : null}

        <hr class="border-gray-200" />

        <div>
          <button
            onClick={handleClearProgress}
            disabled={isClearing}
            class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? 'Clearing...' : 'Clear Progress'}
          </button>
          <p class="text-sm text-gray-500 mt-2">
            Reset your progress and start over with only the basic elements.
          </p>
        </div>
      </div>
    </Modal>
  )
}
