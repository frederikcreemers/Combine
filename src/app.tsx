import { LocationProvider, Router, Route } from 'preact-iso/router'
import { AdminPage } from './admin/AdminPage'
import { OverviewPage } from './admin/OverviewPage'
import { ElementsPage } from './admin/ElementsPage'
import { RecipesPage } from './admin/RecipesPage'
import { ElementPage } from './admin/ElementPage'
import { EditRecipePage } from './admin/EditRecipePage'
import { AdminGuard } from './admin/AdminGuard'
import { GamePage } from './game/GamePage'
import { LinkPage } from './game/LinkPage'

function ProtectedAdminPage({ children }: { children: preact.ComponentChildren }) {
  return <AdminGuard><AdminPage>{children}</AdminPage></AdminGuard>
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
        <Route path="/admin" component={() => <ProtectedAdminPage><OverviewPage /></ProtectedAdminPage>} />
        <Route path="/admin/elements" component={() => <ProtectedAdminPage><ElementsPage /></ProtectedAdminPage>} />
        <Route path="/admin/recipes" component={() => <ProtectedAdminPage><RecipesPage /></ProtectedAdminPage>} />
        <Route path="/admin/elements/:id" component={ProtectedElementPage} />
        <Route path="/admin/recipes/:id" component={ProtectedEditRecipePage} />
      </Router>
    </LocationProvider>
  )
}
