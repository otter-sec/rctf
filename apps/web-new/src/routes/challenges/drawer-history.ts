/**
 * History semantics for the mobile challenge-detail drawer.
 *
 * The drawer participates in browser history: opening it pushes an entry
 * (`page.state.challengeDrawer === true`) so Back dismisses it. These pure
 * helpers keep dismissal from either over-popping history or leaving orphaned
 * entries behind.
 */

/** How a drawer dismissal was triggered. */
export type CloseSource =
  | 'back'
  | 'esc'
  | 'backdrop'
  | 'resize-to-desktop'
  | 'programmatic'

/**
 * What the caller should do to finish dismissing the drawer.
 *
 * - `history-back`: call `history.back()` and let `page.state` reactivity close
 *   the drawer; this consumes the pushed drawer entry.
 * - `close-direct`: the drawer entry is already gone (Back popped it) or was
 *   never pushed, so close without touching history.
 */
export type CloseResolution = 'history-back' | 'close-direct'

/**
 * Resolves how a drawer close should be carried out.
 *
 * @param source - What triggered the dismissal.
 * @param hasDrawerEntryOnTop - Whether our pushed drawer entry is still on top
 *   of the history stack (i.e. `page.state.challengeDrawer === true`).
 */
export function resolveClose(
  source: CloseSource,
  hasDrawerEntryOnTop: boolean
): CloseResolution {
  // A browser Back has already popped our entry; reacting to page.state suffices.
  if (source === 'back') return 'close-direct'
  // Esc/backdrop/resize/programmatic with our entry on top must pop it to keep
  // history clean; without an entry there is nothing to pop.
  return hasDrawerEntryOnTop ? 'history-back' : 'close-direct'
}

/**
 * Reads the `?challenge=` deep-link target, returning it only when it names a
 * challenge that actually exists.
 *
 * @param url - The current page URL.
 * @param challengeIds - IDs of all loaded challenges.
 */
export function getDeepLinkId(
  url: URL,
  challengeIds: ReadonlySet<string>
): string | null {
  const id = url.searchParams.get('challenge')
  return id && challengeIds.has(id) ? id : null
}
