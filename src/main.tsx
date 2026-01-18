import { render } from 'preact'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import { App } from './app.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>,
  document.getElementById('app')!
)
