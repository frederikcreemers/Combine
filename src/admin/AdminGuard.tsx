import { useQuery } from 'convex/react'
import { useLocation } from 'preact-iso/router'
import { useEffect } from 'preact/hooks'
import { api } from '../../convex/_generated/api'
import type { ComponentChildren } from 'preact'

type AdminGuardProps = {
  children: ComponentChildren
}

export function AdminGuard({ children }: AdminGuardProps) {
  const isAdmin = useQuery(api.users.isAdmin)
  const location = useLocation()

  useEffect(() => {
    if (isAdmin === false) {
      location.route('/')
    }
  }, [isAdmin, location])

  if (isAdmin === undefined) {
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

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
