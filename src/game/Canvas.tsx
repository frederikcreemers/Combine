import type { Id } from '../../convex/_generated/dataModel'
import { useRef, useState } from 'preact/hooks'
import { ElementSvg } from '../components/ElementSvg'
import type { ElementView } from '../types'

export type CanvasElement = {
  id: string
  x: number
  y: number
  element: ElementView
}

type CanvasProps = {
  elements: CanvasElement[]
  onAddElement: (element: ElementView, x: number, y: number) => void
  onMoveElement: (id: string, x: number, y: number) => void
  onRemoveElement: (id: string) => void
  onBringToFront: (id: string) => void
  onCombine: (element1Id: Id<'elements'>, element2Id: Id<'elements'>, canvasId1: string | null, canvasId2: string | null) => Promise<boolean>
}

const ELEMENT_WIDTH = 96
const ELEMENT_HEIGHT = 140

type CombiningState = {
  x: number
  y: number
  showSparkles: boolean
}

const GENERATION_SPARKLES = [
  { x: 50, y: 4, size: 26, color: '#fde047', delay: 0, duration: 1.4 },
  { x: 82, y: 16, size: 18, color: '#fb923c', delay: 0.45, duration: 1.7 },
  { x: 96, y: 48, size: 24, color: '#f9a8d4', delay: 0.15, duration: 1.5 },
  { x: 84, y: 81, size: 16, color: '#fde68a', delay: 0.8, duration: 1.8 },
  { x: 52, y: 96, size: 22, color: '#fb7185', delay: 0.3, duration: 1.6 },
  { x: 18, y: 84, size: 18, color: '#fdba74', delay: 1.05, duration: 1.9 },
  { x: 4, y: 52, size: 24, color: '#fef08a', delay: 0.6, duration: 1.5 },
  { x: 17, y: 18, size: 14, color: '#f472b6', delay: 0.95, duration: 1.7 },
  { x: 50, y: 26, size: 14, color: '#fed7aa', delay: 0.7, duration: 1.4 },
  { x: 74, y: 50, size: 12, color: '#fde047', delay: 1.2, duration: 1.8 },
  { x: 50, y: 73, size: 16, color: '#f9a8d4', delay: 0.2, duration: 1.9 },
  { x: 27, y: 50, size: 11, color: '#fb923c', delay: 0.5, duration: 1.6 },
]

export function Canvas({ elements = [], onAddElement, onMoveElement, onRemoveElement, onBringToFront, onCombine }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null)
  const [combiningElementId, setCombiningElementId] = useState<string | null>(null)
  const [shakingElementId, setShakingElementId] = useState<string | null>(null)
  const [combiningState, setCombiningState] = useState<CombiningState | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const sparkleTimeoutRef = useRef<number | null>(null)

  const findElementAtPosition = (x: number, y: number, excludeId?: string): CanvasElement | null => {
    for (const el of elements) {
      if (excludeId && el.id === excludeId) continue
      if (
        x >= el.x &&
        x <= el.x + ELEMENT_WIDTH &&
        y >= el.y &&
        y <= el.y + ELEMENT_HEIGHT
      ) {
        return el
      }
    }
    return null
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const triggerShake = (elementId: string) => {
    setShakingElementId(elementId)
    setTimeout(() => setShakingElementId(null), 500)
  }

  const startCombining = (x: number, y: number) => {
    setCombiningState({ x, y, showSparkles: false })
    sparkleTimeoutRef.current = window.setTimeout(() => {
      setCombiningState((prev) => prev ? { ...prev, showSparkles: true } : null)
    }, 300)
  }

  const stopCombining = () => {
    if (sparkleTimeoutRef.current) {
      clearTimeout(sparkleTimeoutRef.current)
      sparkleTimeoutRef.current = null
    }
    setCombiningState(null)
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canvasRef.current || !e.dataTransfer) return

    const rect = canvasRef.current.getBoundingClientRect()
    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    const canvasElementId = e.dataTransfer.getData('application/canvas-element-id')
    if (canvasElementId) {
      // Moving existing element on canvas
      const draggedElement = elements.find((el) => el.id === canvasElementId)
      const targetElement = findElementAtPosition(dropX, dropY, canvasElementId)

      if (targetElement && draggedElement) {
        // Dropped on another element - combine them
        setCombiningElementId(canvasElementId)
        startCombining(targetElement.x + ELEMENT_WIDTH / 2, targetElement.y + ELEMENT_HEIGHT / 2)
        const success = await onCombine(
          draggedElement.element._id,
          targetElement.element._id,
          draggedElement.id,
          targetElement.id
        )
        stopCombining()
        setCombiningElementId(null)
        if (!success) {
          // Move the dragged element to the drop position and shake it
          const x = dropX - dragOffset.current.x
          const y = dropY - dragOffset.current.y
          onMoveElement(canvasElementId, x, y)
          triggerShake(canvasElementId)
        }
      } else {
        // Just moving the element
        const x = dropX - dragOffset.current.x
        const y = dropY - dragOffset.current.y
        onMoveElement(canvasElementId, x, y)
      }
    } else {
      // Adding new element from collection
      const elementData = e.dataTransfer.getData('application/element')
      if (elementData) {
        const element = JSON.parse(elementData) as ElementView
        const targetElement = findElementAtPosition(dropX, dropY)

        if (targetElement) {
          // Dropped on an existing element - combine them
          startCombining(targetElement.x + ELEMENT_WIDTH / 2, targetElement.y + ELEMENT_HEIGHT / 2)
          const success = await onCombine(
            element._id,
            targetElement.element._id,
            null,
            targetElement.id
          )
          stopCombining()
          if (!success) {
            triggerShake(targetElement.id)
          }
        } else {
          // Just adding to canvas - center the element on cursor
          const x = dropX - ELEMENT_WIDTH / 2
          const y = dropY - ELEMENT_HEIGHT / 2
          onAddElement(element, x, y)
        }
      }
    }
  }

  const handleElementDragStart = (e: DragEvent, canvasElement: CanvasElement) => {
    if (!e.dataTransfer) return
    
    e.dataTransfer.setData('application/canvas-element-id', canvasElement.id)
    e.dataTransfer.effectAllowed = 'copyMove'
    
    // Calculate offset from mouse to element top-left
    const target = e.target as HTMLElement
    const rect = target.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    
    // Move element to end of list so it renders on top
    onBringToFront(canvasElement.id)
    
    // Delay hiding the element so the browser can capture the drag image first
    requestAnimationFrame(() => {
      setDraggingElementId(canvasElement.id)
    })
  }

  const handleElementDragEnd = (e: DragEvent, canvasElement: CanvasElement) => {
    if (!canvasRef.current) {
      setDraggingElementId(null)
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const isOutsideCanvas = 
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom

    if (isOutsideCanvas) {
      // Remove element - don't reset draggingElementId since element will be gone
      onRemoveElement(canvasElement.id)
    } else {
      // Element stays on canvas - make it visible again
      setDraggingElementId(null)
    }
  }

  return (
    <div
      ref={canvasRef}
      class="flex-1 bg-red-900 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes sparkle-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sparkle-field-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(-20deg); }
          35% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(8deg); }
          60% { opacity: 0.75; transform: translate(-50%, -50%) scale(0.72) rotate(20deg); }
        }
        .magical-sparkles {
          animation: sparkle-field-in 0.3s ease-out forwards, sparkle-orbit 4.5s linear infinite;
          transform-origin: center;
        }
        .generation-sparkle {
          animation-name: sparkle-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          filter: drop-shadow(0 0 5px currentColor);
        }
        @media (prefers-reduced-motion: reduce) {
          .magical-sparkles { animation: sparkle-field-in 0.3s ease-out forwards; }
          .generation-sparkle {
            animation: none;
            opacity: 0.85;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
      {elements.length === 0 && <div class="absolute top-3 right-3 pointer-events-none text-orange-400 text-sm">
        Drag elements onto the canvas to combine them
      </div>}
      {elements.map((canvasElement) => {
        const isDragging = canvasElement.id === draggingElementId
        const isCombining = canvasElement.id === combiningElementId
        const isShaking = canvasElement.id === shakingElementId
        const isHidden = isDragging || isCombining
        return (
          <div
            key={canvasElement.id}
            class={`absolute w-24 h-[140px] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none bg-white border border-gray-400 rounded-md p-2 ${isShaking ? 'shake' : ''}`}
            style={{
              left: `${canvasElement.x}px`,
              top: `${canvasElement.y}px`,
              opacity: isHidden ? 0 : 1,
            }}
            draggable
            onDragStart={(e) => handleElementDragStart(e, canvasElement)}
            onDragEnd={(e) => handleElementDragEnd(e, canvasElement)}
          >
            <ElementSvg
              name={canvasElement.element.name}
              svgUrl={canvasElement.element.svgUrl}
              class="w-[60px] h-[60px] pointer-events-none flex-shrink-0"
            />
            <span class="text-sm text-gray-700 mt-1 text-center leading-tight line-clamp-2 pointer-events-none">
              {canvasElement.element.name}
            </span>
          </div>
        )
      })}
      {combiningState?.showSparkles && (
        <div
          class="magical-sparkles absolute pointer-events-none z-50 w-32 h-32"
          style={{
            left: `${combiningState.x - 64}px`,
            top: `${combiningState.y - 64}px`,
          }}
        >
          {GENERATION_SPARKLES.map((sparkle, index) => (
            <span
              key={index}
              class="generation-sparkle absolute font-bold select-none"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                color: sparkle.color,
                fontSize: `${sparkle.size}px`,
                animationDelay: `${sparkle.delay}s`,
                animationDuration: `${sparkle.duration}s`,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
