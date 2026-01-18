import { useQuery } from 'convex/react'
import { useState, useMemo } from 'preact/hooks'
import Fuse from 'fuse.js'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

type ElementCollectionProps = {
  onDragStart?: (element: Doc<'elements'>) => void
}

export function ElementCollection({ onDragStart }: ElementCollectionProps) {
  const unlockedElements = useQuery(api.game.listUnlockedElements)
  const [searchQuery, setSearchQuery] = useState('')

  const fuse = useMemo(() => {
    if (!unlockedElements) return null
    return new Fuse(unlockedElements, {
      keys: ['name'],
      threshold: 0.4,
      ignoreLocation: true,
    })
  }, [unlockedElements])

  const filteredElements = useMemo(() => {
    if (!unlockedElements) return []
    if (!searchQuery.trim()) return unlockedElements
    if (!fuse) return unlockedElements
    return fuse.search(searchQuery).map((result) => result.item)
  }, [unlockedElements, searchQuery, fuse])

  const handleDragStart = (e: DragEvent, element: Doc<'elements'>) => {
    if (!e.dataTransfer) return
    
    e.dataTransfer.setData('application/element', JSON.stringify(element))
    e.dataTransfer.effectAllowed = 'copy'
    
    // Create custom drag image that matches canvas element appearance
    const dragImage = document.createElement('div')
    dragImage.style.cssText = 'position: absolute; top: -1000px; left: -1000px; width: 64px; height: 64px; display: flex; flex-direction: column; align-items: center;'
    
    const svgContainer = document.createElement('div')
    svgContainer.style.cssText = 'width: 48px; height: 48px;'
    svgContainer.innerHTML = element.SVG
    
    const nameLabel = document.createElement('span')
    nameLabel.style.cssText = 'font-size: 12px; color: #374151; margin-top: 4px; white-space: nowrap;'
    nameLabel.textContent = element.name
    
    dragImage.appendChild(svgContainer)
    dragImage.appendChild(nameLabel)
    document.body.appendChild(dragImage)
    
    e.dataTransfer.setDragImage(dragImage, 32, 32)
    
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
          type="text"
          placeholder="Search elements..."
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )
}
