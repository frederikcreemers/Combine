import { useConvexAuth, useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useEffect } from 'preact/hooks'
import { api } from '../../convex/_generated/api'
import { Canvas } from './Canvas'
import { ElementCollection } from './ElementCollection'
import { useRunAfterSignIn } from '../lib/useRunAfterSignIn'

export function GamePage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const unlockInitialElements = useMutation(api.game.unlockInitialElements)

  useRunAfterSignIn(() => {
    unlockInitialElements()
  })

  useEffect(() => {
    (window as any).signOut = signOut
    if (!isLoading && !isAuthenticated) {
      signIn('anonymous')
    }
  }, [isLoading, isAuthenticated, signIn, signOut])

  if (isLoading || !isAuthenticated) {
    return (
      <div class="min-h-screen bg-gray-100 flex items-center justify-center">
        <div class="text-center">
          <svg class="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div class="h-screen flex">
      <Canvas />
      <ElementCollection />
    </div>
  )
}
