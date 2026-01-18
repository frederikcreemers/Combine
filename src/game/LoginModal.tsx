import { useState } from 'preact/hooks'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Modal } from './Modal'

type LoginModalProps = {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
}

export function LoginModal({ isOpen, onClose, onBack }: LoginModalProps) {
  const currentUser = useQuery(api.users.getCurrentUser)
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('email', email)
      if (currentUser?.id) {
        formData.set('redirectTo', `/link/${currentUser.id}`)
      }
      await signIn('resend', formData)
      setEmailSent(true)
    } catch (error) {
      console.error('Failed to send sign-in link:', error)
      alert('Failed to send sign-in link. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const backButton = (
    <button
      onClick={onBack}
      class="text-gray-400 hover:text-gray-600 transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign In" headerLeft={backButton}>
      {emailSent ? (
        <div class="text-center py-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 mx-auto text-green-500 mb-4">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
          <p class="text-gray-600">
            We sent a sign-in link to <strong>{email}</strong>
          </p>
          <button
            onClick={() => {
              setEmailSent(false)
              setEmail('')
            }}
            class="mt-4 text-blue-600 hover:underline text-sm"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p class="text-gray-600 mb-4">
            Enter your email address and we'll send you a sign-in link.
          </p>
          <div class="mb-4">
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="you@example.com"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send sign-in link'}
          </button>
          <p class="text-sm text-gray-500 text-center mt-3">
            You will receive no email from us except for the link to log in.
          </p>
        </form>
      )}
    </Modal>
  )
}
