import type { Doc } from '../../convex/_generated/dataModel'
import { useRef } from 'preact/hooks'

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
}

export function Canvas({ elements = [], onAddElement, onMoveElement, onRemoveElement }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const draggedElementId = useRef<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canvasRef.current || !e.dataTransfer) return

    const rect = canvasRef.current.getBoundingClientRect()

    const canvasElementId = e.dataTransfer.getData('application/canvas-element-id')
    if (canvasElementId) {
      // Moving existing element on canvas
      const x = e.clientX - rect.left - dragOffset.current.x
      const y = e.clientY - rect.top - dragOffset.current.y
      onMoveElement(canvasElementId, x, y)
    } else {
      // Adding new element from collection - center the element on cursor
      const elementData = e.dataTransfer.getData('application/element')
      if (elementData) {
        const element = JSON.parse(elementData) as Doc<'elements'>
        const x = e.clientX - rect.left - 32 // Center the 64px element
        const y = e.clientY - rect.top - 32
        onAddElement(element, x, y)
      }
    }
  }

  const handleElementDragStart = (e: DragEvent, canvasElement: CanvasElement) => {
    if (!e.dataTransfer) return
    
    draggedElementId.current = canvasElement.id
    e.dataTransfer.setData('application/canvas-element-id', canvasElement.id)
    e.dataTransfer.effectAllowed = 'copyMove'
    
    // Calculate offset from mouse to element top-left
    const target = e.target as HTMLElement
    const rect = target.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleElementDragEnd = (e: DragEvent, canvasElement: CanvasElement) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const isOutsideCanvas = 
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom

    if (isOutsideCanvas) {
      onRemoveElement(canvasElement.id)
    }

    draggedElementId.current = null
  }

  return (
    <div
      ref={canvasRef}
      class="flex-1 bg-gray-200 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {elements.map((canvasElement) => (
        <div
          key={canvasElement.id}
          class="absolute w-16 h-16 flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
          style={{
            left: `${canvasElement.x}px`,
            top: `${canvasElement.y}px`,
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
      ))}
    </div>
  )
}
