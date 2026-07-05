import { describe, expect, test } from 'bun:test'
import { resolvePinnedEdge, type PinnedEdgeInput } from './pinned-self-row'

// The reducer decides which edge (if any) a copy of the current user's row
// pins to. Position derivations (self index within the loaded list, the clip
// state of the real row) are computed by each route and passed in; the reducer
// only maps them to `top` / `bottom` / null.

function input(overrides: Partial<PinnedEdgeInput> = {}): PinnedEdgeInput {
  return {
    hasSelf: true,
    selfIndex: 5,
    viewportClip: 'visible',
    searchActive: false,
    ...overrides,
  }
}

describe('resolvePinnedEdge — AE1 coverage', () => {
  test('self on an unloaded later page pins to the bottom edge', () => {
    // Ranked beyond the loaded pages: no real row exists, so `selfIndex` is
    // null. The board always loads from rank 1 down, so self sits below it.
    expect(resolvePinnedEdge(input({ selfIndex: null }))).toBe('bottom')
  })

  test('self clipped above the viewport pins to the top edge', () => {
    expect(resolvePinnedEdge(input({ viewportClip: 'above' }))).toBe('top')
  })

  test('self clipped below the viewport pins to the bottom edge', () => {
    expect(resolvePinnedEdge(input({ viewportClip: 'below' }))).toBe('bottom')
  })

  test('self fully visible does not pin', () => {
    expect(resolvePinnedEdge(input({ viewportClip: 'visible' }))).toBeNull()
  })

  test('an active search suppresses the pin entirely', () => {
    expect(
      resolvePinnedEdge(input({ viewportClip: 'above', searchActive: true }))
    ).toBeNull()
  })

  test('no known self does not pin', () => {
    expect(
      resolvePinnedEdge(input({ hasSelf: false, selfIndex: null }))
    ).toBeNull()
  })

  test('first page still loading with a known self pins to the bottom edge', () => {
    // Nothing loaded yet (selfIndex null) but the user is known: the old app
    // shows the pinned row during loading so placement stays in view.
    expect(
      resolvePinnedEdge(input({ selfIndex: null, viewportClip: null }))
    ).toBe('bottom')
  })
})

describe('resolvePinnedEdge — precedence and unobserved rows', () => {
  test('search suppression wins even when self is unloaded', () => {
    expect(
      resolvePinnedEdge(input({ selfIndex: null, searchActive: true }))
    ).toBeNull()
  })

  test('a loaded self whose row is unmounted falls back to the bottom edge', () => {
    // The virtual row scrolled out of the DOM and the observer reset, so there
    // is no clip signal; the reducer keeps a stable edge rather than flicker.
    expect(
      resolvePinnedEdge(input({ selfIndex: 12, viewportClip: null }))
    ).toBe('bottom')
  })

  test('challenges mapping: unloaded self ignores a stale visible clip', () => {
    // When self is not in the loaded list the route passes selfIndex null; a
    // leftover `visible` clip must not unpin it.
    expect(
      resolvePinnedEdge(input({ selfIndex: null, viewportClip: 'visible' }))
    ).toBe('bottom')
  })
})
