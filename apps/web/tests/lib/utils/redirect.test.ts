import { getRedirectPath } from '$lib/utils/redirect'
import { describe, expect, test } from 'bun:test'

const ORIGIN = 'https://ctf.example.com'

describe('getRedirectPath', () => {
  test.each([
    ['/challenges', '/challenges'],
    ['/scores?division=open#top', '/scores?division=open#top'],
    [
      '/external-auth/authorize?client_id=a&redirect_uri=b&state=c',
      '/external-auth/authorize?client_id=a&redirect_uri=b&state=c',
    ],
    ['/', '/'],
    ['/a/b/c', '/a/b/c'],
  ])('allows same-origin path %s', (next, expected) => {
    expect(getRedirectPath(next, ORIGIN)).toBe(expected)
  })

  test.each([
    [null],
    [''],
    ['challenges'],
    ['https://evil.com'],
    ['https://evil.com/'],
    ['http://ctf.example.com/downgrade'],
    ['javascript:alert(1)'],
    ['mailto:a@evil.com'],
    [' /leading-space'],
  ])('falls back to / for non-path input %p', next => {
    expect(getRedirectPath(next, ORIGIN)).toBe('/')
  })

  test.each([
    ['//evil.com'],
    ['//evil.com/path'],
    ['/\\evil.com'],
    ['\\/evil.com'],
    ['/..//evil.com'],
    ['/a/..//evil.com'],
    ['///evil.com'],
    ['/\t//evil.com'],
    ['/\n//evil.com'],
    ['//%2Fevil.com'],
  ])('rejects protocol-relative and normalization tricks %p', next => {
    expect(getRedirectPath(next, ORIGIN)).toBe('/')
  })

  test('keeps encoded slashes as an inert path', () => {
    expect(getRedirectPath('/%2F%2Fevil.com', ORIGIN)).toBe('/%2F%2Fevil.com')
  })

  test('normalizes dot segments within the origin', () => {
    expect(getRedirectPath('/a/../b', ORIGIN)).toBe('/b')
  })
})
