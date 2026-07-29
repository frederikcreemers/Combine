import type { Id } from '../convex/_generated/dataModel'

export type ElementView = {
  _id: Id<'elements'>
  _creationTime?: number
  name: string
  svgUrl: string
}
