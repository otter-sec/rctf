import { scoreProviders } from '@rctf/scoring'
import type { ScoreContext } from '@rctf/scoring/base'
import { describe, expect, test } from 'bun:test'

const baseCtx: ScoreContext = {
  minPoints: 100,
  maxPoints: 500,
  solves: 0,
  maxSolves: 0,
  eventStartTime: 0,
  eventEndTime: 1_000_000_000,
  firstSolveTime: null,
}

describe('score providers revision', () => {
  test('all providers expose a non-empty revision', () => {
    const providers = Object.entries(scoreProviders)
    expect(providers.length).toBeGreaterThan(0)

    for (const [name, createProvider] of providers) {
      const provider = createProvider({})
      expect(typeof provider.revision).toBe('string')
      expect(provider.revision.length).toBeGreaterThan(0)
      expect(name.startsWith('scores/')).toBe(true)
    }
  })
})

describe('score provider common properties', () => {
  const providers = Object.entries(scoreProviders)

  for (const [name, createProvider] of providers) {
    const provider = createProvider({})

    describe(name, () => {
      test('returns maxPoints for 0 solves', () => {
        const score = provider.calculate({ ...baseCtx })
        expect(score).toBe(baseCtx.maxPoints)
      })

      test('is deterministic', () => {
        const ctx = {
          ...baseCtx,
          solves: 5,
          maxSolves: 10,
          firstSolveTime: 500,
        }
        const a = provider.calculate(ctx)
        const b = provider.calculate(ctx)
        expect(a).toBe(b)
      })

      test('score is within [0, maxPoints]', () => {
        for (let i = 0; i <= 200; i++) {
          const score = provider.calculate({
            ...baseCtx,
            solves: i,
            maxSolves: Math.max(i, 1),
            firstSolveTime: i > 0 ? 100 : null,
          })
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(baseCtx.maxPoints)
        }
      })
    })
  }
})
