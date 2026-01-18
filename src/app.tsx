import { LocationProvider, Router, Route } from 'preact-iso/router'
import { AdminPage } from './admin/AdminPage'
import { ElementPage } from './admin/ElementPage'
import { GamePage } from './game/GamePage'

export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={GamePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/elements/:id" component={ElementPage} />
      </Router>
    </LocationProvider>
  )
}
