import { describe, expect, test } from 'bun:test'
import {
  getDeepLinkId,
  resolveClose,
  type CloseResolution,
  type CloseSource,
} from './drawer-history'

describe('resolveClose', () => {
  test.each<[CloseSource, boolean, CloseResolution]>([
    ['esc', true, 'history-back'],
    ['backdrop', true, 'history-back'],
    ['resize-to-desktop', true, 'history-back'],
    ['programmatic', true, 'history-back'],
    ['esc', false, 'close-direct'],
    ['backdrop', false, 'close-direct'],
    ['resize-to-desktop', false, 'close-direct'],
    ['programmatic', false, 'close-direct'],
    ['back', true, 'close-direct'],
    ['back', false, 'close-direct'],
  ])('resolveClose(%p, %p) -> %s', (source, hasEntry, expected) => {
    expect(resolveClose(source, hasEntry)).toBe(expected)
  })
})

describe('getDeepLinkId', () => {
  const ids = new Set(['abc', 'def'])
  const urlWith = (query: string) =>
    new URL(`https://ctf.example.com/challenges${query}`)

  test('returns the id when ?challenge names an existing challenge', () => {
    expect(getDeepLinkId(urlWith('?challenge=abc'), ids)).toBe('abc')
  })

  test.each([
    ['?challenge=ghost', 'unknown id'],
    ['', 'no query param'],
    ['?challenge=', 'empty param'],
    ['?other=abc', 'unrelated param'],
  ])('returns null for %p (%s)', query => {
    expect(getDeepLinkId(urlWith(query), ids)).toBeNull()
  })

  test('returns null against an empty challenge set', () => {
    expect(getDeepLinkId(urlWith('?challenge=abc'), new Set())).toBeNull()
  })
})
