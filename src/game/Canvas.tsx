import type { Doc, Id } from '../../convex/_generated/dataModel'
import { useRef, useState } from 'preact/hooks'

export type CanvasElement = {
  id: string
  x: number
  y: number
  element: Doc<'elements'>
}

type CanvasProps = {
  elements: CanvasElement[]
  onAddElement: (element: Doc<'elements'>, x: number, y: number) => void
  onMoveElement: (id: string, x: number, y: number) => void
  onRemoveElement: (id: string) => void
  onBringToFront: (id: string) => void
  onCombine: (element1Id: Id<'elements'>, element2Id: Id<'elements'>, canvasId1: string | null, canvasId2: string | null) => Promise<boolean>
}

const ELEMENT_SIZE = 64

export function Canvas({ elements = [], onAddElement, onMoveElement, onRemoveElement, onBringToFront, onCombine }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null)
  const [combiningElementId, setCombiningElementId] = useState<string | null>(null)
  const [shakingElementId, setShakingElementId] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const findElementAtPosition = (x: number, y: number, excludeId?: string): CanvasElement | null => {
    for (const el of elements) {
      if (excludeId && el.id === excludeId) continue
      if (
        x >= el.x &&
        x <= el.x + ELEMENT_SIZE &&
        y >= el.y &&
        y <= el.y + ELEMENT_SIZE
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
        const success = await onCombine(
          draggedElement.element._id,
          targetElement.element._id,
          draggedElement.id,
          targetElement.id
        )
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
        const element = JSON.parse(elementData) as Doc<'elements'>
        const targetElement = findElementAtPosition(dropX, dropY)

        if (targetElement) {
          // Dropped on an existing element - combine them
          const success = await onCombine(
            element._id,
            targetElement.element._id,
            null,
            targetElement.id
          )
          if (!success) {
            triggerShake(targetElement.id)
          }
        } else {
          // Just adding to canvas
          const x = dropX - 32 // Center the 64px element
          const y = dropY - 32
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
      class="flex-1 bg-gray-200 relative overflow-hidden"
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
      `}</style>
      {elements.map((canvasElement) => {
        const isDragging = canvasElement.id === draggingElementId
        const isCombining = canvasElement.id === combiningElementId
        const isShaking = canvasElement.id === shakingElementId
        const isHidden = isDragging || isCombining
        return (
          <div
            key={canvasElement.id}
            class={`absolute w-16 h-16 flex flex-col items-center cursor-grab active:cursor-grabbing select-none ${isShaking ? 'shake' : ''}`}
            style={{
              left: `${canvasElement.x}px`,
              top: `${canvasElement.y}px`,
              opacity: isHidden ? 0 : 1,
            }}
            draggable
            onDragStart={(e) => handleElementDragStart(e, canvasElement)}
            onDragEnd={(e) => handleElementDragEnd(e, canvasElement)}
          >
            <div
              class="w-12 h-12 pointer-events-none"
              dangerouslySetInnerHTML={{ __html: canvasElement.element.SVG }}
            />
            <span class="text-xs text-gray-700 mt-1 whitespace-nowrap pointer-events-none">
              {canvasElement.element.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
