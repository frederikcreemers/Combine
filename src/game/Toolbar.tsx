type ToolbarProps = {
  onClearCanvas: () => void
  onAccountClick: () => void
}

export function Toolbar({ onClearCanvas, onAccountClick }: ToolbarProps) {
  return (
    <div class="w-12 bg-red-950 flex flex-col items-center py-2 gap-2">
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
        {/* Tooltip */}
        <span class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Clear canvas
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
        {/* Tooltip */}
        <span class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Account
        </span>
      </button>
    </div>
  )
}
