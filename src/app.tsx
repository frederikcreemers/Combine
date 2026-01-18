import { LocationProvider, Router, Route } from 'preact-iso/router'
import { AdminPage } from './admin/AdminPage'
import { ElementPage } from './admin/ElementPage'
import { EditRecipePage } from './admin/EditRecipePage'
import { GamePage } from './game/GamePage'
import { LinkPage } from './game/LinkPage'

export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={GamePage} />
        <Route path="/link/:id" component={LinkPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/elements/:id" component={ElementPage} />
        <Route path="/admin/recipes/:id" component={EditRecipePage} />
      </Router>
    </LocationProvider>
  )
}
