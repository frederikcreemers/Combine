import { render } from 'preact'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import { App } from './app.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
  document.getElementById('app')!
)
