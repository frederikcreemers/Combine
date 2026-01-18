import { useEffect, useState } from 'preact/hooks'
import { useConvexAuth, useMutation } from 'convex/react'
import { useLocation } from 'preact-iso/router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

interface LinkPageProps {
  id: string
}

export function LinkPage({ id }: LinkPageProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const linkAccount = useMutation(api.users.linkAccount)
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    const doLink = async () => {
      try {
        await linkAccount({ anonymousUserId: id as Id<'users'> })
        location.route('/')
      } catch (err) {
        console.error('Failed to link account:', err)
        setError('Failed to link account. Please try again.')
      }
    }
    doLink()
  }, [id, linkAccount, location, isLoading, isAuthenticated])

  if (error) {
    return (
      <div class="min-h-screen bg-gray-100 flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 text-center">
          <h1 class="text-xl font-semibold text-red-600 mb-4">Error</h1>
          <p class="text-gray-600 mb-4">{error}</p>
          <a href="/" class="text-blue-600 hover:underline">Go to home page</a>
        </div>
      </div>
    )
  }

  return (
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 text-center">
        <svg class="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h1 class="text-xl font-semibold text-gray-900">Linking Account...</h1>
      </div>
    </div>
  )
}
