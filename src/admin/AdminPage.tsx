import { ElementsList } from './ElementsList'
import { AddElementForm } from './AddElementForm'

export function AdminPage() {
  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold mb-6 text-gray-900">Admin Page</h1>
        <AddElementForm />
        <ElementsList />
      </div>
    </div>
  );
}
