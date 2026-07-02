import { getTimeOrdinal } from '@rctf/util'
import type { RankVariant } from './solve-times'

// The podium prefers the self tint over the medal colour, unlike the ranked
// rows (`rankVariant`) where medals win for the top three. Positions past the
// third fall back to the neutral 'nth' fill.
const MEDAL_VARIANTS: RankVariant[] = ['gold', 'silver', 'bronze', 'nth']

/**
 * One of the top solvers/scorers, already reduced to the fields the podium
 * renders. `detail` is the variant-specific right-hand line the caller has
 * formatted (a solve time for flags, an `N pts` value for dynamic scoring), and
 * `isSelf` marks the entry as the current user so the top three can adopt the
 * self tint.
 */
export interface PodiumEntry {
  userId: string
  name: string
  avatarUrl: string | null
  detail: string
  isSelf: boolean
}

/**
 * The current user's own placement, shown in the fourth slot when they solved
 * the challenge but sit outside the top three. `position` supplies the ordinal
 * label; `detail` is the caller-formatted right-hand line.
 */
export interface PodiumSelf {
  name: string
  avatarUrl: string | null
  position: number
  detail: string
}

/**
 * The fallback shown in the fourth slot for an authenticated user who has no
 * placement yet. `detail` carries the variant-specific empty message
 * ('Unsolved' for flags, 'No score' for dynamic scoring).
 */
export interface PodiumPlaceholder {
  name: string
  avatarUrl: string | null
  detail: string
}

export type PodiumSlotKind = 'entry' | 'self' | 'placeholder' | 'empty'

export interface PodiumSlot {
  kind: PodiumSlotKind
  variant: RankVariant
  ordinal: string
  name: string
  avatarUrl: string | null
  detail: string
  isSelf: boolean
}

export interface ResolvePodiumInput {
  /** Top solvers/scorers in rank order; only the first four are consulted. */
  top: PodiumEntry[]
  /** The user's own placement to show in slot 4, or null when it shouldn't. */
  selfEntry: PodiumSelf | null
  /** The You/empty fallback for slot 4; null when the user is logged out. */
  placeholder: PodiumPlaceholder | null
  isAuthenticated: boolean
}

function entrySlot(index: number, entry: PodiumEntry): PodiumSlot {
  return {
    kind: 'entry',
    variant: entry.isSelf ? 'self' : (MEDAL_VARIANTS[index] ?? 'nth'),
    ordinal: getTimeOrdinal(index + 1),
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    detail: entry.detail,
    isSelf: entry.isSelf,
  }
}

function emptySlot(index: number): PodiumSlot {
  return {
    kind: 'empty',
    variant: MEDAL_VARIANTS[index] ?? 'nth',
    ordinal: '',
    name: '',
    avatarUrl: null,
    detail: '',
    isSelf: false,
  }
}

function selfSlot(self: PodiumSelf): PodiumSlot {
  return {
    kind: 'self',
    variant: 'self',
    ordinal: getTimeOrdinal(self.position),
    name: self.name,
    avatarUrl: self.avatarUrl,
    detail: self.detail,
    isSelf: true,
  }
}

function placeholderSlot(fallback: PodiumPlaceholder): PodiumSlot {
  return {
    kind: 'placeholder',
    variant: 'nth',
    ordinal: 'You',
    name: fallback.name,
    avatarUrl: fallback.avatarUrl,
    detail: fallback.detail,
    isSelf: true,
  }
}

/**
 * Arranges the four podium slots shared by the flag and dynamic variants.
 *
 * Slots 1-3 are the top three entries, backfilled with empty dashed slots when
 * fewer exist. Slot 4 follows the old app's rules:
 *
 * - user in the top three, or logged out → the fourth entry (or empty);
 * - otherwise a self placement is available → the self slot (its own ordinal);
 * - otherwise → the You placeholder;
 * - otherwise (defensive) → empty.
 *
 * When the current user is exactly the fourth solver they are deduped into the
 * self slot rather than rendered twice: the fourth entry is dropped and the
 * self slot (built from `selfEntry`) stands in its place.
 *
 * The function stays agnostic to flag-vs-dynamic differences: all detail
 * strings and the self/placeholder gating are decided by the caller and passed
 * in as precomputed fields.
 */
export function resolvePodiumSlots(input: ResolvePodiumInput): PodiumSlot[] {
  const { top, selfEntry, placeholder, isAuthenticated } = input

  const slots: PodiumSlot[] = []
  for (let index = 0; index < 3; index++) {
    const entry = top[index]
    slots.push(entry ? entrySlot(index, entry) : emptySlot(index))
  }

  const userInTopThree = top.slice(0, 3).some(entry => entry.isSelf)
  const fourthEntry = top[3]

  if (userInTopThree || !isAuthenticated) {
    slots.push(fourthEntry ? entrySlot(3, fourthEntry) : emptySlot(3))
  } else if (selfEntry) {
    slots.push(selfSlot(selfEntry))
  } else if (placeholder) {
    slots.push(placeholderSlot(placeholder))
  } else {
    slots.push(emptySlot(3))
  }

  return slots
}

/**
 * The minimum column count (1-4) at which each slot stays visible as the podium
 * collapses through its container-query breakpoints.
 *
 * The self slot never hides. The remaining slots hide highest-index-first, so
 * the top-ranked slots and the user's own slot survive the longest: as the grid
 * narrows from four columns to one, the fourth slot drops first, then the third,
 * then the second, always keeping the self slot (and, absent a self slot, the
 * first-place slot) on screen.
 */
export function podiumMinColumns(slots: PodiumSlot[]): number[] {
  const selfIndex = slots.findIndex(slot => slot.isSelf)
  const hideOrder = slots
    .map((_, index) => index)
    .filter(index => index !== selfIndex)
    .reverse()
  return slots.map((_, index) => {
    if (index === selfIndex) return 1
    return 4 - hideOrder.indexOf(index)
  })
}
