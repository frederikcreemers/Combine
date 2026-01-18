import { useQuery } from 'convex/react'
import { useState, useMemo, useEffect, useRef } from 'preact/hooks'
import Fuse from 'fuse.js'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

type ElementCollectionProps = {
  onDragStart?: (element: Doc<'elements'>) => void
}

export function ElementCollection({ onDragStart }: ElementCollectionProps) {
  const unlockedElements = useQuery(api.game.listUnlockedElements)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in another input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Handle Escape in the search input
        if (e.key === 'Escape' && target === searchInputRef.current) {
          setSearchQuery('')
          searchInputRef.current?.blur()
        }
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

  const handleDragStart = (e: DragEvent, element: Doc<'elements'>) => {
    if (!e.dataTransfer) return
    
    e.dataTransfer.setData('application/element', JSON.stringify(element))
    e.dataTransfer.effectAllowed = 'copy'
    
    // Create custom drag image that matches canvas element card appearance
    const dragImage = document.createElement('div')
    dragImage.style.cssText = 'position: absolute; top: -1000px; left: -1000px; width: 96px; height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; border: 1px solid #9ca3af; border-radius: 6px; padding: 8px;'
    
    const svgContainer = document.createElement('div')
    svgContainer.style.cssText = 'width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;'
    svgContainer.innerHTML = element.SVG
    
    const nameLabel = document.createElement('span')
    nameLabel.style.cssText = 'font-size: 14px; color: #374151; margin-top: 4px; text-align: center; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;'
    nameLabel.textContent = element.name
    
    dragImage.appendChild(svgContainer)
    dragImage.appendChild(nameLabel)
    document.body.appendChild(dragImage)
    
    e.dataTransfer.setDragImage(dragImage, 48, 70)
    
    // Clean up the drag image element after a short delay
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage)
    })
    
    onDragStart?.(element)
  }

  if (unlockedElements === undefined) {
    return (
      <div class="w-[15%] min-w-[200px] bg-white border-l border-gray-300 p-4">
        <p class="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div class="w-[15%] min-w-[200px] bg-white border-l border-gray-300 flex flex-col">
      <div class="p-4 pb-2">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Elements</h2>
      </div>
      <div class="flex-1 overflow-y-auto px-4">
        <div class="space-y-2">
          {filteredElements.map((element) => (
            <div
              key={element._id}
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing select-none"
              draggable
              onDragStart={(e) => handleDragStart(e, element as Doc<'elements'>)}
            >
              <div
                class="w-8 h-8 flex-shrink-0 pointer-events-none"
                dangerouslySetInnerHTML={{ __html: element.SVG }}
              />
              <span class="text-sm text-gray-700 truncate pointer-events-none">{element.name}</span>
            </div>
          ))}
          {filteredElements.length === 0 && searchQuery && (
            <p class="text-sm text-gray-500 text-center py-2">No elements found</p>
          )}
        </div>
      </div>
      <div class="p-4 pt-2 border-t border-gray-200">
        <input
          ref={searchInputRef}
          type="text"
          placeholder={`Search ${unlockedElements.length} elements...`}
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('')
              searchInputRef.current?.blur()
            }
          }}
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )
}
