import { useConvexAuth } from 'convex/react'
import { useEffect, useRef } from 'preact/hooks'

export function useRunAfterSignIn(callback: () => void) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const wasAuthenticated = useRef<boolean | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref up to date
  callbackRef.current = callback

  useEffect(() => {
    console.log({ isLoading, isAuthenticated, wasAuthenticated: wasAuthenticated.current })
    if (isLoading) {
      return
    }

    // Check if we transitioned from unauthenticated to authenticated
    if (wasAuthenticated.current !== true && isAuthenticated === true) {
      callbackRef.current()
    }

    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated, isLoading])
}
