import { useEffect } from 'preact/hooks'
import type { ComponentChildren } from 'preact'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  maxWidth?: 'sm' | 'md' | 'lg'
  headerLeft?: ComponentChildren
  children: ComponentChildren
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({ isOpen, onClose, title, maxWidth = 'md', headerLeft, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        class={`bg-white rounded-lg shadow-xl w-full ${maxWidthClasses[maxWidth]} mx-4 max-h-[80vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div class="flex items-center gap-2">
            {headerLeft}
            <h2 class="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
