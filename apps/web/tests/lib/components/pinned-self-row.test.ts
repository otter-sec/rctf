import {
  resolvePinnedEdge,
  type PinnedEdgeInput,
} from '$lib/components/pinned-self-row'
import { describe, expect, test } from 'bun:test'

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
    expect(
      resolvePinnedEdge(input({ selfIndex: 12, viewportClip: null }))
    ).toBe('bottom')
  })

  test('challenges mapping: unloaded self ignores a stale visible clip', () => {
    expect(
      resolvePinnedEdge(input({ selfIndex: null, viewportClip: 'visible' }))
    ).toBe('bottom')
  })
})
