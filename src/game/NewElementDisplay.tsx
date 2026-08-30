import { useEffect, useState } from 'preact/hooks'
import { ElementSvg } from '../components/ElementSvg'

type NewElementDisplayProps = {
  element: {
    name: string
    description?: string
    svgUrl: string
    generationStatus?: 'pending' | 'complete' | 'failed'
  }
  recipeDiscovered?: boolean
  elementDiscovered?: boolean
  onDismiss: () => void
}

const DISCOVERY_SPARKLES = [
  { x: 50, y: 8, size: 25, color: '#fde047', delay: 0 },
  { x: 78, y: 22, size: 18, color: '#fb923c', delay: 0.45 },
  { x: 88, y: 50, size: 23, color: '#f9a8d4', delay: 0.15 },
  { x: 76, y: 78, size: 16, color: '#fde68a', delay: 0.8 },
  { x: 50, y: 90, size: 21, color: '#fb7185', delay: 0.3 },
  { x: 22, y: 78, size: 18, color: '#fdba74', delay: 1.05 },
  { x: 10, y: 50, size: 23, color: '#fef08a', delay: 0.6 },
  { x: 22, y: 22, size: 15, color: '#f472b6', delay: 0.95 },
]

export function NewElementDisplay({ element, recipeDiscovered, elementDiscovered, onDismiss }: NewElementDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const isGenerating = elementDiscovered && element.generationStatus === 'pending'
  const generationFailed = elementDiscovered && element.generationStatus === 'failed'
  const title = recipeDiscovered && !elementDiscovered ? 'New Recipe!' : 'New Element!'

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const handleClick = () => {
    if (isGenerating) return
    setIsVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      class={`fixed inset-0 bg-red-900 flex flex-col items-center justify-center z-50 transition-opacity duration-300 ${isGenerating ? 'cursor-wait' : 'cursor-pointer'} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClick}
      aria-live="polite"
    >
      <style>{`
        @keyframes rotate-rays {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes discovery-phase-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes flask-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes tip-left {
          0%, 18%, 100% { transform: rotate(12deg); }
          38%, 78% { transform: rotate(32deg); }
        }
        @keyframes tip-right {
          0%, 18%, 100% { transform: rotate(-12deg); }
          38%, 78% { transform: rotate(-32deg); }
        }
        @keyframes pour-liquid {
          0%, 20%, 85%, 100% { opacity: 0; stroke-dashoffset: 28; }
          35%, 72% { opacity: 1; stroke-dashoffset: 0; }
        }
        @keyframes bubble-rise {
          0% { opacity: 0; transform: translateY(12px) scale(0.6); }
          35% { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(-24px) scale(1.1); }
        }
        @keyframes discovery-sparkle-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes discovery-sparkle-twinkle {
          0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(-20deg); }
          35% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(8deg); }
          65% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.7) rotate(20deg); }
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
        .discovery-phase { animation: discovery-phase-in 0.45s ease-out both; }
        .chemistry-flask { animation: flask-float 2.2s ease-in-out infinite; }
        .ingredient-left, .ingredient-right { transform-box: fill-box; transform-origin: center; }
        .ingredient-left { animation: tip-left 2.4s ease-in-out infinite; }
        .ingredient-right { animation: tip-right 2.4s ease-in-out infinite; }
        .liquid-stream {
          animation: pour-liquid 2.4s ease-in-out infinite;
          stroke-dasharray: 28;
        }
        .flask-bubble { animation: bubble-rise 1.7s ease-out infinite; transform-box: fill-box; }
        .discovery-sparkles {
          animation: discovery-sparkle-orbit 5s linear infinite;
          transform-origin: center;
        }
        .discovery-sparkle {
          animation: discovery-sparkle-twinkle 1.6s ease-in-out infinite;
          filter: drop-shadow(0 0 5px currentColor);
        }
        @media (prefers-reduced-motion: reduce) {
          .rays-bg, .discovery-phase, .chemistry-flask, .ingredient-left,
          .ingredient-right, .liquid-stream, .flask-bubble,
          .discovery-sparkles, .discovery-sparkle { animation: none; }
          .liquid-stream, .flask-bubble, .discovery-sparkle { opacity: 0.85; }
        }
      `}</style>
      <div
        class="rays-bg absolute w-[200vmax] h-[200vmax] top-1/2 left-1/2"
        style={{ transformOrigin: 'center center' }}
      />

      {isGenerating ? (
        <div key="generating" class="discovery-phase relative z-10 flex flex-col items-center text-center px-6">
          <h1 class="text-4xl font-bold text-white">You created a new element!</h1>
          <p class="text-lg text-red-100 mt-3">We're taking a closer look to see what it is.</p>
          <div class="relative w-72 h-64 mt-6" aria-label="Mixing ingredients in a chemistry flask">
            <svg class="w-full h-full overflow-visible" viewBox="0 0 288 256" role="img">
              <g transform="translate(0 -28)">
                <g class="ingredient-left">
                  <path d="M35 42h48l-6 42c-1 8-8 14-16 14h-4c-8 0-15-6-16-14z" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
                  <path d="M43 70h34l-2 15c-1 5-5 9-11 9H54c-6 0-10-4-11-9z" fill="#60a5fa" />
                </g>
              </g>
              <g transform="translate(0 -28)">
                <g class="ingredient-right">
                  <path d="M205 42h48l-6 42c-1 8-8 14-16 14h-4c-8 0-15-6-16-14z" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
                  <path d="M213 70h34l-2 15c-1 5-5 9-11 9h-10c-6 0-10-4-11-9z" fill="#f9a8d4" />
                </g>
              </g>
              <path class="liquid-stream" d="M94 31c10 17 24 40 41 60" fill="none" stroke="#60a5fa" stroke-width="8" stroke-linecap="round" />
              <path class="liquid-stream" d="M194 31c-10 17-24 40-41 60" fill="none" stroke="#f9a8d4" stroke-width="8" stroke-linecap="round" style={{ animationDelay: '0.2s' }} />
              <g class="chemistry-flask">
                <path d="M124 82h40m-33 0v46l-38 68c-7 12 2 27 16 27h70c14 0 23-15 16-27l-38-68V82" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M106 184h76l13 24c4 7-1 15-9 15h-84c-8 0-13-8-9-15z" fill="#fb7185" fill-opacity=".85" />
                <path d="M116 166c15-9 39 9 56 0l10 18h-76z" fill="#fde047" fill-opacity=".8" />
                <circle class="flask-bubble" cx="128" cy="188" r="6" fill="#fef08a" />
                <circle class="flask-bubble" cx="153" cy="202" r="5" fill="#f9a8d4" style={{ animationDelay: '0.5s' }} />
                <circle class="flask-bubble" cx="165" cy="184" r="4" fill="#fdba74" style={{ animationDelay: '1s' }} />
              </g>
            </svg>
            <div class="discovery-sparkles absolute inset-0 pointer-events-none">
              {DISCOVERY_SPARKLES.map((sparkle, index) => (
                <span
                  key={index}
                  class="discovery-sparkle absolute font-bold select-none"
                  style={{
                    left: `${sparkle.x}%`,
                    top: `${sparkle.y}%`,
                    color: sparkle.color,
                    fontSize: `${sparkle.size}px`,
                    animationDelay: `${sparkle.delay}s`,
                  }}
                >
                  ✦
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : generationFailed ? (
        <div key="failed" class="discovery-phase relative z-10 flex flex-col items-center text-center px-6">
          <h1 class="text-4xl font-bold text-white">New Element!</h1>
          <div class="bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center mt-8 max-w-md mx-4">
            <ElementSvg name={element.name} svgUrl={element.svgUrl} class="w-32 h-32" />
            <span class="text-xl text-gray-700 dark:text-gray-100 mt-2">{element.name}</span>
          </div>
          <p class="text-red-100 mt-5 max-w-md">We found the element, but couldn't finish its illustration.</p>
          <p class="text-white text-sm mt-8 opacity-75">Click anywhere to continue</p>
        </div>
      ) : (
        <div key="complete" class="discovery-phase relative z-10 flex flex-col items-center text-center px-6">
          <h1 class="text-4xl font-bold text-white mb-8">{title}</h1>
          <div class="bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center max-w-md mx-4">
            <ElementSvg name={element.name} svgUrl={element.svgUrl} class="w-32 h-32" />
            <span class="text-xl text-gray-700 dark:text-gray-100 mt-2">{element.name}</span>
          </div>
          {element.description && (
            <p class="text-sm text-white italic text-center mt-4 max-w-md mx-4">
              {element.description}
            </p>
          )}
          {elementDiscovered ? (
            <p class="text-yellow-300 text-lg font-semibold mt-6">
              You were the first to discover this element!
            </p>
          ) : recipeDiscovered ? (
            <p class="text-yellow-300 text-lg font-semibold mt-6">
              You were the first to discover this recipe for {element.name}!
            </p>
          ) : null}
          <p class="text-white text-sm mt-8 opacity-75">Click anywhere to continue</p>
        </div>
      )}
    </div>
  )
}
