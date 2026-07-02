import { describe, expect, test } from 'bun:test'
import {
  resolveSubmitState,
  type SubmitLadderInput,
  type SubmitState,
} from './submit-ladder'

// Every input names a default that would resolve to 'form', so each case below
// flips exactly the fields under test.
function input(overrides: Partial<SubmitLadderInput> = {}): SubmitLadderInput {
  return {
    isArchived: false,
    endTime: 100,
    now: 50,
    isAuthenticated: true,
    isSolved: false,
    ...overrides,
  }
}

describe('resolveSubmitState', () => {
  test.each<[string, Partial<SubmitLadderInput>, SubmitState]>([
    // archived wins over every later rung (ended + login + solved all true).
    [
      'archived beats everything',
      { isArchived: true, now: 200, isAuthenticated: false, isSolved: true },
      'archived',
    ],
    ['archived beats solved', { isArchived: true, isSolved: true }, 'archived'],
    // ended (now > endTime) beats login, solved, and form.
    ['ended beats login', { now: 200, isAuthenticated: false }, 'ended'],
    ['ended beats solved', { now: 200, isSolved: true }, 'ended'],
    ['ended beats form', { now: 200 }, 'ended'],
    [
      'ended when unauthenticated',
      { now: 200, isAuthenticated: false },
      'ended',
    ],
    // login when unauthenticated and the CTF is live.
    ['login when unauthenticated', { isAuthenticated: false }, 'login'],
    ['login beats solved', { isAuthenticated: false, isSolved: true }, 'login'],
    // solved when authenticated, live, and already solved.
    ['solved when solved', { isSolved: true }, 'solved'],
    // form is the fallthrough.
    ['form otherwise', {}, 'form'],
  ])('%s', (_label, overrides, expected) => {
    expect(resolveSubmitState(input(overrides))).toBe(expected)
  })

  // The old app compares strictly (`now > clientConfig.endTime`), so the exact
  // end instant is NOT yet ended — it stays on the live rung. See
  // apps/web/src/routes/challenges/challenges-details-submit.svelte.
  describe('ended boundary (old-app semantics: now > endTime)', () => {
    test('now === endTime is not ended (falls through to form)', () => {
      expect(resolveSubmitState(input({ now: 100, endTime: 100 }))).toBe('form')
    })

    test('now === endTime is not ended (falls through to login when unauthenticated)', () => {
      expect(
        resolveSubmitState(
          input({ now: 100, endTime: 100, isAuthenticated: false })
        )
      ).toBe('login')
    })

    test('now === endTime + 1 is ended', () => {
      expect(resolveSubmitState(input({ now: 101, endTime: 100 }))).toBe(
        'ended'
      )
    })
  })
})
