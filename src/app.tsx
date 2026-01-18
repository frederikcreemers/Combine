import { LocationProvider, Router, Route } from 'preact-iso/router'
import { AdminPage } from './admin/AdminPage'

export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/admin" component={AdminPage} />
      </Router>
    </LocationProvider>
  )
}
