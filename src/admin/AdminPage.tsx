import { Tabs } from './Tabs'

interface AdminPageProps {
  children: preact.ComponentChildren
}

export function AdminPage({ children }: AdminPageProps) {
  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold mb-6 text-gray-900">Admin Page</h1>
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', href: '/admin' },
            { id: 'elements', label: 'Elements', href: '/admin/elements' },
            { id: 'recipes', label: 'Recipes', href: '/admin/recipes' },
          ]}
        >
          {children}
        </Tabs>
      </div>
    </div>
  );
}
