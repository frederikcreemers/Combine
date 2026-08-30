import { useQuery } from 'convex/react'
import { useState, useMemo, useEffect, useRef } from 'preact/hooks'
import Fuse from 'fuse.js'
import { api } from '../../convex/_generated/api'
import { ElementSvg } from '../components/ElementSvg'
import { AutoFitText, fitTextToLines } from '../components/AutoFitText'
import type { ElementView } from '../types'

type ElementCollectionProps = {
  onDragStart?: (element: ElementView) => void
  onPointerDrop?: (element: ElementView, clientX: number, clientY: number) => void
}

type PointerDrag = {
  pointerId: number
  element: ElementView
  startX: number
  startY: number
  dragging: boolean
}

const POINTER_DRAG_THRESHOLD = 6

export function ElementCollection({ onDragStart, onPointerDrop }: ElementCollectionProps) {
  const unlockedElements = useQuery(api.game.listUnlockedElements)
  const [searchQuery, setSearchQuery] = useState('')
  const [pointerDragPosition, setPointerDragPosition] = useState<{ x: number; y: number; element: ElementView } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pointerDragRef = useRef<PointerDrag | null>(null)
  const suppressNativeDragRef = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape anywhere - clear search and focus input
      if (e.key === 'Escape') {
        setSearchQuery('')
        searchInputRef.current?.focus()
        return
      }

      // Ignore letter keys if user is typing in another input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Focus search and type the letter if it's a single letter key
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        searchInputRef.current?.focus()
        // The letter will be typed naturally since we focused the input
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const sortedElements = useMemo(() => {
    if (!unlockedElements) return []
    return [...unlockedElements].sort((a, b) => a.name.localeCompare(b.name))
  }, [unlockedElements])

  const fuse = useMemo(() => {
    if (!sortedElements.length) return null
    return new Fuse(sortedElements, {
      keys: ['name'],
      threshold: 0.4,
      ignoreLocation: true,
    })
  }, [sortedElements])

  const filteredElements = useMemo(() => {
    if (!sortedElements.length) return []
    if (!searchQuery.trim()) return sortedElements
    if (!fuse) return sortedElements
    return fuse.search(searchQuery).map((result) => result.item)
  }, [sortedElements, searchQuery, fuse])

  const handleDragStart = (e: DragEvent, element: ElementView) => {
    if (suppressNativeDragRef.current) {
      e.preventDefault()
      return
    }
    if (!e.dataTransfer) return
    const darkMode = document.documentElement.classList.contains('dark')
    
    e.dataTransfer.setData('application/element', JSON.stringify(element))
    e.dataTransfer.effectAllowed = 'copy'
    
    // Create custom drag image that matches canvas element card appearance
    const dragImage = document.createElement('div')
    dragImage.style.cssText = `position: absolute; top: -1000px; left: -1000px; width: 96px; height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${darkMode ? '#111827' : 'white'}; border: 1px solid ${darkMode ? '#4b5563' : '#9ca3af'}; border-radius: 6px; padding: 8px;`
    
    const svgContainer = document.createElement('div')
    svgContainer.style.cssText = 'width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;'
    const image = document.createElement('img')
    image.src = element.svgUrl
    image.alt = ''
    image.style.cssText = 'width: 100%; height: 100%; object-fit: contain;'
    svgContainer.appendChild(image)
    
    const nameLabel = document.createElement('span')
    nameLabel.style.cssText = `width: 80px; color: ${darkMode ? '#f3f4f6' : '#374151'}; margin-top: 4px; text-align: center; overflow-wrap: anywhere;`
    nameLabel.textContent = element.name
    
    dragImage.appendChild(svgContainer)
    dragImage.appendChild(nameLabel)
    document.body.appendChild(dragImage)
    fitTextToLines(nameLabel)
    
    e.dataTransfer.setDragImage(dragImage, 48, 70)
    
    // Clean up the drag image element after a short delay
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage)
    })
    
    onDragStart?.(element)
  }

  const handlePointerDown = (e: PointerEvent, element: ElementView) => {
    if (e.pointerType === 'mouse' || e.button !== 0) return

    e.preventDefault()
    suppressNativeDragRef.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointerDragRef.current = {
      pointerId: e.pointerId,
      element,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    }
  }

  const handlePointerMove = (e: PointerEvent) => {
    const pointerDrag = pointerDragRef.current
    if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return

    const distance = Math.hypot(
      e.clientX - pointerDrag.startX,
      e.clientY - pointerDrag.startY,
    )
    if (!pointerDrag.dragging && distance < POINTER_DRAG_THRESHOLD) return

    e.preventDefault()
    if (!pointerDrag.dragging) {
      pointerDrag.dragging = true
      onDragStart?.(pointerDrag.element)
    }
    setPointerDragPosition({
      x: e.clientX,
      y: e.clientY,
      element: pointerDrag.element,
    })
  }

  const finishPointerDrag = (e: PointerEvent, cancelled = false) => {
    const pointerDrag = pointerDragRef.current
    if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return

    pointerDragRef.current = null
    setPointerDragPosition(null)
    window.setTimeout(() => {
      suppressNativeDragRef.current = false
    }, 0)
    if (!cancelled && pointerDrag.dragging) {
      onPointerDrop?.(pointerDrag.element, e.clientX, e.clientY)
    }
  }

  if (unlockedElements === undefined) {
    return (
      <div class="w-1/3 md:w-[15%] md:min-w-[200px] bg-white dark:bg-gray-950 border-l border-gray-300 dark:border-gray-800 p-4">
        <p class="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div class="w-1/3 md:w-[15%] md:min-w-[200px] bg-white dark:bg-gray-950 border-l border-gray-300 dark:border-gray-800 flex flex-col">
      <div class="p-4 pb-2">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Elements</h2>
      </div>
      <div class="flex-1 overflow-y-auto px-4">
        <div class="space-y-2">
          {filteredElements.map((element) => (
            <div
              key={element._id}
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab active:cursor-grabbing select-none"
              draggable
              onDragStart={(e) => handleDragStart(e, element)}
              title={element.description}
            >
              <div
                class="w-11 h-11 -m-1.5 flex items-center justify-center flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handlePointerDown(e, element)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => finishPointerDrag(e)}
                onPointerCancel={(e) => finishPointerDrag(e, true)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <ElementSvg
                  name={element.name}
                  svgUrl={element.svgUrl}
                  class="w-8 h-8 pointer-events-none"
                />
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-200 truncate pointer-events-none">{element.name}</span>
            </div>
          ))}
          {filteredElements.length === 0 && searchQuery && (
            <p class="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No elements found</p>
          )}
        </div>
      </div>
      <div class="p-4 pt-2 border-t border-gray-200 dark:border-gray-800">
        <input
          ref={searchInputRef}
          type="text"
          placeholder={`Search ${unlockedElements.length} elements...`}
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {pointerDragPosition && (
        <div
          aria-hidden="true"
          class="fixed z-[100] w-24 h-[140px] flex flex-col items-center justify-center bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md p-2 pointer-events-none shadow-xl"
          style={{
            left: `${pointerDragPosition.x}px`,
            top: `${pointerDragPosition.y}px`,
            transform: 'translate(-50%, -85%)',
          }}
        >
          <ElementSvg
            name={pointerDragPosition.element.name}
            svgUrl={pointerDragPosition.element.svgUrl}
            class="w-[60px] h-[60px] pointer-events-none flex-shrink-0"
          />
          <AutoFitText class="w-20 mt-1 text-sm text-gray-700 dark:text-gray-100 text-center">
            {pointerDragPosition.element.name}
          </AutoFitText>
        </div>
      )}
    </div>
  )
}
