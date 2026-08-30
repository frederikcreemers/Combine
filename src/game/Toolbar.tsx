import type { Theme } from '../lib/useTheme'

type ToolbarProps = {
  onClearCanvas: () => void
  onAccountClick: () => void
  onDiscoveriesClick: () => void
  onAboutClick: () => void
  onThemeToggle: () => void
  theme: Theme
  energy?: number | null
  maxEnergy?: number
}

export function Toolbar({
  onClearCanvas,
  onAccountClick,
  onDiscoveriesClick,
  onAboutClick,
  onThemeToggle,
  theme,
  energy,
  maxEnergy = 30,
}: ToolbarProps) {
  return (
    <div class="h-14 md:h-full md:w-12 bg-red-950 flex md:flex-col items-center justify-center md:justify-start px-2 md:px-0 md:py-2 gap-2">
      {energy !== undefined && energy !== null && (
        <div class="h-10 px-2 md:h-auto md:px-0 md:w-10 flex md:flex-col items-center justify-center rounded-lg bg-red-900 md:py-1 group relative">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            class={`w-5 h-5 ${energy === 0 ? 'text-red-400' : 'text-amber-300'}`}
          >
            <path d="M13 2L4.5 13.5H11L10 22L19.5 9.5H13L13 2Z" />
          </svg>
          <span class={`text-xs font-semibold leading-none md:mt-0.5 ml-1 md:ml-0 ${energy === 0 ? 'text-red-300' : 'text-amber-100'}`}>
            {energy}
          </span>
          {/* Tooltip: above on mobile, right on desktop */}
          <div class="absolute bottom-full md:bottom-auto md:left-full md:top-0 mb-2 md:mb-0 md:ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-56">
            <div class="font-semibold mb-1">Energy</div>
            <div class="text-gray-300 leading-snug">
              Discovering a previously unknown element costs 5 ⚡, discovering a new recipe for an existing element costs 1 ⚡.
            </div>
            <div class="text-gray-400 mt-1.5">
              {energy}/{maxEnergy} remaining today
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onClearCanvas}
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-900 hover:bg-red-800 transition-colors group relative"
        title="Clear canvas"
      >
        {/* Trash/Clear icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-6 h-6 text-red-200"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        {/* Tooltip: above on mobile, right on desktop */}
        <span class="absolute bottom-full md:bottom-auto md:left-full mb-2 md:mb-0 md:ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Clear canvas
        </span>
      </button>

      <button
        onClick={onDiscoveriesClick}
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-900 hover:bg-red-800 transition-colors group relative"
        title="Your Discoveries"
      >
        {/* Lightbulb icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-6 h-6 text-red-200"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        {/* Tooltip: above on mobile, right on desktop */}
        <span class="absolute bottom-full md:bottom-auto md:left-full mb-2 md:mb-0 md:ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Your Discoveries
        </span>
      </button>

      <button
        onClick={onAccountClick}
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-900 hover:bg-red-800 transition-colors group relative"
        title="Account"
      >
        {/* User/Account icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-6 h-6 text-red-200"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {/* Tooltip: above on mobile, right on desktop */}
        <span class="absolute bottom-full md:bottom-auto md:left-full mb-2 md:mb-0 md:ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Account
        </span>
      </button>

      <button
        onClick={onThemeToggle}
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-900 hover:bg-red-800 transition-colors group relative"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-pressed={theme === 'dark'}
      >
        {theme === 'dark' ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-6 h-6 text-amber-200"
          >
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-6 h-6 text-blue-200"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          </svg>
        )}
        <span class="absolute bottom-full md:bottom-auto md:left-full mb-2 md:mb-0 md:ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Switch to {theme === 'dark' ? 'light' : 'dark'} mode
        </span>
      </button>

      <button
        onClick={onAboutClick}
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-900 hover:bg-red-800 transition-colors group relative"
        title="About"
      >
        {/* Info icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-6 h-6 text-red-200"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        {/* Tooltip: above on mobile, right on desktop */}
        <span class="absolute bottom-full md:bottom-auto md:left-full mb-2 md:mb-0 md:ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          About
        </span>
      </button>
    </div>
  )
}
