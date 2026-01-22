import { useLocation } from 'preact-iso/router'

interface Tab {
  id: string
  label: string
  href: string
}

interface TabsProps {
  tabs: Tab[]
  children: preact.ComponentChildren
}

export function Tabs({ tabs, children }: TabsProps) {
  const { path } = useLocation()

  return (
    <div>
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = path === tab.href || (tab.href === '/admin' && path === '/admin/')
            return (
              <a
                key={tab.id}
                href={tab.href}
                class={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </a>
            )
          })}
        </nav>
      </div>
      <div class="mt-6">{children}</div>
    </div>
  )
}
