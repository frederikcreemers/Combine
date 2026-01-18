import { LocationProvider, Router, Route } from 'preact-iso/router'
import { AdminPage } from './admin/AdminPage'
import { ElementPage } from './admin/ElementPage'
import { EditRecipePage } from './admin/EditRecipePage'
import { AdminGuard } from './admin/AdminGuard'
import { GamePage } from './game/GamePage'
import { LinkPage } from './game/LinkPage'

function ProtectedAdminPage() {
  return <AdminGuard><AdminPage /></AdminGuard>
}

function ProtectedElementPage({ id }: { id: string }) {
  return <AdminGuard><ElementPage id={id} /></AdminGuard>
}

function ProtectedEditRecipePage({ id }: { id: string }) {
  return <AdminGuard><EditRecipePage id={id} /></AdminGuard>
}

export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={GamePage} />
        <Route path="/link/:id" component={LinkPage} />
        <Route path="/admin" component={ProtectedAdminPage} />
        <Route path="/admin/elements/:id" component={ProtectedElementPage} />
        <Route path="/admin/recipes/:id" component={ProtectedEditRecipePage} />
      </Router>
    </LocationProvider>
  )
}
