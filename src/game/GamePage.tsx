import { useConvexAuth, useAction, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useEffect, useState, useCallback, useRef } from 'preact/hooks'
import { api } from '../../convex/_generated/api'
import { Canvas, ELEMENT_HEIGHT, ELEMENT_WIDTH, type CanvasElement } from './Canvas'
import { ElementCollection } from './ElementCollection'
import { NewElementDisplay } from './NewElementDisplay'
import { Toolbar } from './Toolbar'
import { AccountModal } from './AccountModal'
import { LoginModal } from './LoginModal'
import { DiscoveredItemsModal } from './DiscoveredItemsModal'
import { AboutModal } from './AboutModal'
import { LoginRequiredModal } from './LoginRequiredModal'
import { RateLimitModal } from './RateLimitModal'
import { useRunAfterSignIn } from '../lib/useRunAfterSignIn'
import { useTheme } from '../lib/useTheme'
import type { Id } from '../../convex/_generated/dataModel'
import type { ElementView } from '../types'

type NewElement = {
  _id: Id<'elements'>
  name: string
  description?: string
  svgUrl: string
  generationStatus?: 'pending' | 'complete' | 'failed'
  recipeDiscovered: boolean
  elementDiscovered: boolean
}

let nextCanvasElementId = 0

export function GamePage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { theme, toggleTheme } = useTheme()
  const { signIn, signOut } = useAuthActions()
  const unlockInitialElements = useMutation(api.game.unlockInitialElements)
  const combineAction = useAction(api.game.combine)
  const energyStatus = useQuery(api.energy.getEnergy)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([])
  const [newElementToShow, setNewElementToShow] = useState<NewElement | null>(null)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isDiscoveriesModalOpen, setIsDiscoveriesModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false)
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false)
  const generatedElement = useQuery(
    api.elements.getElementView,
    newElementToShow?.elementDiscovered &&
      newElementToShow.generationStatus === 'pending'
      ? { elementId: newElementToShow._id }
      : 'skip'
  )

  useRunAfterSignIn(() => {
    unlockInitialElements()
  })

  useEffect(() => {
    (window as any).signOut = signOut
    if (!isLoading && !isAuthenticated) {
      signIn('anonymous')
    }
  }, [isLoading, isAuthenticated, signIn, signOut])

  useEffect(() => {
    if (!generatedElement || generatedElement.generationStatus === 'pending') {
      return
    }

    setCanvasElements((previous) =>
      previous.map((canvasElement) =>
        canvasElement.element._id === generatedElement._id
          ? { ...canvasElement, element: generatedElement }
          : canvasElement
      )
    )
    setNewElementToShow((current) =>
      current?._id === generatedElement._id
        ? {
            ...generatedElement,
            recipeDiscovered: current.recipeDiscovered,
            elementDiscovered: current.elementDiscovered,
          }
        : current
    )
  }, [generatedElement])

  const handleAddElement = useCallback((element: ElementView, x: number, y: number) => {
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

  const handleBringToFront = useCallback((id: string) => {
    setCanvasElements((prev) => {
      const element = prev.find((el) => el.id === id)
      if (!element) return prev
      return [...prev.filter((el) => el.id !== id), element]
    })
  }, [])

  const handleClearCanvas = useCallback(() => {
    setCanvasElements([])
  }, [])

  const handleCombine = useCallback(
    async (element1Id: Id<'elements'>, element2Id: Id<'elements'>, canvasId1: string | null, canvasId2: string | null): Promise<boolean> => {
      try {
        const result = await combineAction({
          element1: element1Id,
          element2: element2Id,
        })

        if ('requiresLogin' in result) {
          setIsLoginRequiredModalOpen(true)
          return false
        }

        if ('rateLimitExceeded' in result) {
          setIsRateLimitModalOpen(true)
          return false
        }

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
            element: result.element,
          }
          return [...filtered, newElement]
        })

        // Show new element display if this is a newly unlocked element
        if (result.new) {
          setNewElementToShow({
            _id: result.element._id,
            name: result.element.name,
            description: result.element.description,
            svgUrl: result.element.svgUrl,
            generationStatus: result.element.generationStatus,
            recipeDiscovered: result.recipeDiscovered,
            elementDiscovered: result.elementDiscovered,
          })
        }

        return true
      } catch (error) {
        console.error('Failed to combine elements:', error)
        return false
      }
    },
    [combineAction, canvasElements]
  )

  const handleCollectionPointerDrop = useCallback(
    async (element: ElementView, clientX: number, clientY: number) => {
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) return

      const dropX = clientX - rect.left
      const dropY = clientY - rect.top
      const targetElement = [...canvasElements].reverse().find((candidate) =>
        dropX >= candidate.x &&
        dropX <= candidate.x + ELEMENT_WIDTH &&
        dropY >= candidate.y &&
        dropY <= candidate.y + ELEMENT_HEIGHT
      )

      if (targetElement) {
        await handleCombine(
          element._id,
          targetElement.element._id,
          null,
          targetElement.id,
        )
        return
      }

      handleAddElement(
        element,
        dropX - ELEMENT_WIDTH / 2,
        dropY - ELEMENT_HEIGHT / 2,
      )
    },
    [canvasElements, handleAddElement, handleCombine],
  )

  if (isLoading || !isAuthenticated) {
    return (
      <div class="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div class="text-center">
          <svg class="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div class="h-screen flex flex-col">
      {/* Main content area: canvas + elements side by side */}
      <div class="flex-1 flex min-h-0">
        {/* Toolbar: hidden on mobile, shown on desktop */}
        <div class="hidden md:block shrink-0">
          <Toolbar
            onClearCanvas={handleClearCanvas}
            onAccountClick={() => setIsAccountModalOpen(true)}
            onDiscoveriesClick={() => setIsDiscoveriesModalOpen(true)}
            onAboutClick={() => setIsAboutModalOpen(true)}
            onThemeToggle={toggleTheme}
            theme={theme}
            energy={energyStatus?.energy}
            maxEnergy={energyStatus?.maxEnergy}
          />
        </div>
        <Canvas
          canvasRef={canvasRef}
          elements={canvasElements}
          onAddElement={handleAddElement}
          onMoveElement={handleMoveElement}
          onRemoveElement={handleRemoveElement}
          onBringToFront={handleBringToFront}
          onCombine={handleCombine}
        />
        <ElementCollection onPointerDrop={handleCollectionPointerDrop} />
      </div>
      {/* Toolbar: shown on mobile at bottom, hidden on desktop */}
      <div class="md:hidden shrink-0">
        <Toolbar
          onClearCanvas={handleClearCanvas}
          onAccountClick={() => setIsAccountModalOpen(true)}
          onDiscoveriesClick={() => setIsDiscoveriesModalOpen(true)}
          onAboutClick={() => setIsAboutModalOpen(true)}
          onThemeToggle={toggleTheme}
          theme={theme}
          energy={energyStatus?.energy}
          maxEnergy={energyStatus?.maxEnergy}
        />
      </div>
      {newElementToShow && (
        <NewElementDisplay
          element={newElementToShow}
          recipeDiscovered={newElementToShow.recipeDiscovered}
          elementDiscovered={newElementToShow.elementDiscovered}
          onDismiss={() => setNewElementToShow(null)}
        />
      )}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onLoginClick={() => {
          setIsAccountModalOpen(false)
          setIsLoginModalOpen(true)
        }}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onBack={() => {
          setIsLoginModalOpen(false)
          setIsAccountModalOpen(true)
        }}
      />
      <DiscoveredItemsModal
        isOpen={isDiscoveriesModalOpen}
        onClose={() => setIsDiscoveriesModalOpen(false)}
      />
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
        onLoginClick={() => {
          setIsLoginRequiredModalOpen(false)
          setIsLoginModalOpen(true)
        }}
      />
      <RateLimitModal
        isOpen={isRateLimitModalOpen}
        onClose={() => setIsRateLimitModalOpen(false)}
      />
    </div>
  )
}
