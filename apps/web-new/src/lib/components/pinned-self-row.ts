/**
 * Shared pinned-edge reducer for the self-row overlay used by the scoreboard
 * and the challenge solves list. Both surfaces pin a copy of the current
 * user's row to an edge of a scroll container whenever the real row is not
 * fully visible — including when the user's rank lies beyond the loaded pages.
 *
 * Only the edge decision is shared. Each route derives the inputs from its own
 * geometry (`mySolvePosition` for challenges, `globalPlace` versus the loaded
 * range for scores) and maps its IntersectionObserver signal onto
 * {@link ViewportClip}.
 */

/** The edge a pinned copy of the self row sits on. */
export type PinnedEdge = 'top' | 'bottom'

/**
 * Clip state of the current user's real row relative to the scroll viewport.
 * `null` means the row is not currently observed — either it is not in the
 * loaded pages, or its virtualized element is unmounted.
 */
export type ViewportClip = 'above' | 'below' | 'visible' | null

export interface PinnedEdgeInput {
  /** Whether the current user is known well enough to render a pinned row. */
  hasSelf: boolean
  /** Self's index within the loaded rows, or null when it is not loaded. */
  selfIndex: number | null
  /** IntersectionObserver clip state of self's real row. */
  viewportClip: ViewportClip
  /** Whether a server search is active; pinning is suppressed during search. */
  searchActive: boolean
}

/**
 * Decides which edge the self-row overlay pins to, or null to hide it.
 *
 * A loaded, observed row defers to its clip state. Any unobserved self — first
 * page still loading, rank beyond the loaded pages, or a virtual row scrolled
 * out of the DOM — pins to the bottom edge, since the board always loads from
 * rank 1 downward and so an unseen self sits below the loaded range.
 */
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
