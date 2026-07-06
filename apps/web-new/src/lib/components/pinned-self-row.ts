export type PinnedEdge = 'top' | 'bottom'

export type ViewportClip = 'above' | 'below' | 'visible' | null

export interface PinnedEdgeInput {
  hasSelf: boolean
  selfIndex: number | null
  viewportClip: ViewportClip
  searchActive: boolean
}

export function resolvePinnedEdge(input: PinnedEdgeInput): PinnedEdge | null {
  if (input.searchActive) return null
  if (!input.hasSelf) return null

  if (input.selfIndex !== null && input.viewportClip !== null) {
    switch (input.viewportClip) {
      case 'above':
        return 'top'
      case 'below':
        return 'bottom'
      case 'visible':
        return null
    }
  }

  return 'bottom'
}
