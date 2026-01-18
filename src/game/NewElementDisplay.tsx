import { useEffect, useState } from 'preact/hooks'

type NewElementDisplayProps = {
  element: {
    name: string
    SVG: string
  }
  recipeDiscovered?: boolean
  elementDiscovered?: boolean
  onDismiss: () => void
}

export function NewElementDisplay({ element, recipeDiscovered, elementDiscovered, onDismiss }: NewElementDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const handleClick = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Wait for fade out animation
  }

  return (
    <div
      class={`fixed inset-0 bg-red-900 flex flex-col items-center justify-center cursor-pointer z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClick}
    >
      <style>{`
        @keyframes rotate-rays {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .rays-bg {
          background: conic-gradient(
            from 0deg,
            #7f1d1d 0deg 15deg, #991b1b 15deg 30deg,
            #7f1d1d 30deg 45deg, #991b1b 45deg 60deg,
            #7f1d1d 60deg 75deg, #991b1b 75deg 90deg,
            #7f1d1d 90deg 105deg, #991b1b 105deg 120deg,
            #7f1d1d 120deg 135deg, #991b1b 135deg 150deg,
            #7f1d1d 150deg 165deg, #991b1b 165deg 180deg,
            #7f1d1d 180deg 195deg, #991b1b 195deg 210deg,
            #7f1d1d 210deg 225deg, #991b1b 225deg 240deg,
            #7f1d1d 240deg 255deg, #991b1b 255deg 270deg,
            #7f1d1d 270deg 285deg, #991b1b 285deg 300deg,
            #7f1d1d 300deg 315deg, #991b1b 315deg 330deg,
            #7f1d1d 330deg 345deg, #991b1b 345deg 360deg
          );
          animation: rotate-rays 20s linear infinite;
        }
      `}</style>
      <div
        class="rays-bg absolute w-[200vmax] h-[200vmax] top-1/2 left-1/2"
        style={{ transformOrigin: 'center center' }}
      />
      <h1 class="text-4xl font-bold text-white mb-8 relative z-10">New Element!</h1>
      <div class="bg-white border border-gray-400 rounded-lg p-4 flex flex-col items-center relative z-10">
        <div
          class="w-32 h-32 flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: element.SVG }}
        />
        <span class="text-xl text-gray-700 mt-2">{element.name}</span>
      </div>
      {elementDiscovered ? (
        <p class="text-yellow-300 text-lg font-semibold mt-6 relative z-10">
          You were the first to discover this element!
        </p>
      ) : recipeDiscovered ? (
        <p class="text-yellow-300 text-lg font-semibold mt-6 relative z-10">
          You were the first to discover this recipe for {element.name}!
        </p>
      ) : null}
      <p class="text-white text-sm mt-8 opacity-75 relative z-10">Click anywhere to continue</p>
    </div>
  )
}
