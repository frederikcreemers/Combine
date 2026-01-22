import { useState } from 'preact/hooks'
import { AddElementForm } from './AddElementForm'
import { ElementsList } from './ElementsList'

export function ElementsPage() {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <>
      {showAddForm ? (
        <AddElementForm onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          class="mb-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Add Element
        </button>
      )}
      <ElementsList />
    </>
  )
}
