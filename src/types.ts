import type { Id } from '../convex/_generated/dataModel'

export type ElementView = {
  _id: Id<'elements'>
  _creationTime?: number
  name: string
  svgUrl: string | null
  // Present only for legacy rows until the storage migration is complete.
  SVG?: string
}
