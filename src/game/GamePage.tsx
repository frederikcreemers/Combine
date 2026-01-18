import { useConvexAuth, useAction, useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { api } from '../../convex/_generated/api'
import { Canvas, type CanvasElement } from './Canvas'
import { ElementCollection } from './ElementCollection'
import { useRunAfterSignIn } from '../lib/useRunAfterSignIn'
import type { Doc, Id } from '../../convex/_generated/dataModel'

let nextCanvasElementId = 0

export function GamePage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const unlockInitialElements = useMutation(api.game.unlockInitialElements)
  const combineAction = useAction(api.game.combine)
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([])

  useRunAfterSignIn(() => {
    unlockInitialElements()
  })

  useEffect(() => {
    (window as any).signOut = signOut
    if (!isLoading && !isAuthenticated) {
      signIn('anonymous')
    }
  }, [isLoading, isAuthenticated, signIn, signOut])

  const handleAddElement = useCallback((element: Doc<'elements'>, x: number, y: number) => {
    const newCanvasElement: CanvasElement = {
      id: `canvas-element-${nextCanvasElementId++}`,
      x,
      y,
      element,
    }
    setCanvasElements((prev) => [...prev, newCanvasElement])
  }, [])

  const handleMoveElement = useCallback((id: string, x: number, y: number) => {
    setCanvasElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x, y } : el))
    )
  }, [])

  const handleRemoveElement = useCallback((id: string) => {
    setCanvasElements((prev) => prev.filter((el) => el.id !== id))
  }, [])

  const handleCombine = useCallback(
    async (element1Id: Id<'elements'>, element2Id: Id<'elements'>, canvasId1: string | null, canvasId2: string | null) => {
      try {
        const result = await combineAction({
          element1: element1Id,
          element2: element2Id,
        })

        if (result) {
          // Get position of the target element (the one being dropped onto)
          const targetElement = canvasElements.find((el) => el.id === canvasId2)
          const position = targetElement ? { x: targetElement.x, y: targetElement.y } : { x: 100, y: 100 }

          // Remove both elements and add the result
          setCanvasElements((prev) => {
            const filtered = prev.filter((el) => el.id !== canvasId1 && el.id !== canvasId2)
            const newElement: CanvasElement = {
              id: `canvas-element-${nextCanvasElementId++}`,
              x: position.x,
              y: position.y,
              element: result.element as Doc<'elements'>,
            }
            return [...filtered, newElement]
          })
        }
        // If result is null, no valid recipe - leave elements on canvas
      } catch (error) {
        console.error('Failed to combine elements:', error)
      }
    },
    [combineAction, canvasElements]
  )

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
      <Canvas
        elements={canvasElements}
        onAddElement={handleAddElement}
        onMoveElement={handleMoveElement}
        onRemoveElement={handleRemoveElement}
        onCombine={handleCombine}
      />
      <ElementCollection />
    </div>
  )
}
