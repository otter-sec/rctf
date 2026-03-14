import { describe, expect, test } from 'bun:test'
import type { ScoreContext } from '../../../../apps/api/src/providers/scores/base'
import JammyProvider from '../../../../apps/api/src/providers/scores/jammy'

describe('jammy-scoring', () => {
  // Test data generated from reference Python implementation
  // https://github.com/RealJammy/Jammy-Scoring
  const eventStartTime = 1722038400000
  const eventEndTime = 1722211200000
  const minPoints = 1
  const maxPoints = 1000
  const maximumScoreTime = 0.8

  const provider = new JammyProvider({ maximumScoreTime })

  const createContext = (firstSolveTime: number | null): ScoreContext => ({
    minPoints,
    maxPoints,
    solves: 0,
    maxSolves: 0,
    eventStartTime,
    eventEndTime,
    firstSolveTime,
  })

  const testCases = [
    {
      name: 'sanity-check',
      firstSolveTime: 1722038416000,
      timeSinceStart: 16,
      expectedScore: 1,
    },
    {
      name: 'survey',
      firstSolveTime: 1722038591000,
      timeSinceStart: 191,
      expectedScore: 2,
    },
    {
      name: 'the-conspiracy',
      firstSolveTime: 1722038958000,
      timeSinceStart: 558,
      expectedScore: 5,
    },
    {
      name: 'steps',
      firstSolveTime: 1722039439000,
      timeSinceStart: 1039,
      expectedScore: 8,
    },
    {
      name: 'lights-out',
      firstSolveTime: 1722039560000,
      timeSinceStart: 1160,
      expectedScore: 9,
    },
    {
      name: 'rock-paper-scissors',
      firstSolveTime: 1722039741000,
      timeSinceStart: 1341,
      expectedScore: 10,
    },
    {
      name: 'touch grass 2',
      firstSolveTime: 1722040094000,
      timeSinceStart: 1694,
      expectedScore: 13,
    },
    {
      name: 'infiltration',
      firstSolveTime: 1722041004000,
      timeSinceStart: 2604,
      expectedScore: 19,
    },
    {
      name: 'erm',
      firstSolveTime: 1722041606000,
      timeSinceStart: 3206,
      expectedScore: 24,
    },
    {
      name: 'roots',
      firstSolveTime: 1722043770000,
      timeSinceStart: 5370,
      expectedScore: 39,
    },
    {
      name: 'monkfish',
      firstSolveTime: 1722044371000,
      timeSinceStart: 5971,
      expectedScore: 44,
    },
    {
      name: 'exchange',
      firstSolveTime: 1722044536000,
      timeSinceStart: 6136,
      expectedScore: 45,
    },
    {
      name: 'format-string',
      firstSolveTime: 1722047618000,
      timeSinceStart: 9218,
      expectedScore: 67,
    },
    {
      name: 'anglerfish',
      firstSolveTime: 1722047859000,
      timeSinceStart: 9459,
      expectedScore: 69,
    },
    {
      name: 'corctf-challenge-dev',
      firstSolveTime: 1722049242000,
      timeSinceStart: 10842,
      expectedScore: 79,
    },
    {
      name: 'schitty-challenge',
      firstSolveTime: 1722054292000,
      timeSinceStart: 15892,
      expectedScore: 115,
    },
    {
      name: 'two-wrongs',
      firstSolveTime: 1722059583000,
      timeSinceStart: 21183,
      expectedScore: 154,
    },
    {
      name: 'corMine: The Beginning',
      firstSolveTime: 1722062529000,
      timeSinceStart: 24129,
      expectedScore: 175,
    },
    {
      name: 'corMine 2: Revelations',
      firstSolveTime: 1722073951000,
      timeSinceStart: 35551,
      expectedScore: 258,
    },
    {
      name: 'digest-me',
      firstSolveTime: 1722087536000,
      timeSinceStart: 49136,
      expectedScore: 356,
    },
    {
      name: 'corchat x',
      firstSolveTime: 1722089039000,
      timeSinceStart: 50639,
      expectedScore: 367,
    },
    {
      name: 'cshell4',
      firstSolveTime: 1722095471000,
      timeSinceStart: 57071,
      expectedScore: 413,
    },
    {
      name: 'trojan-turtles',
      firstSolveTime: 1722103828000,
      timeSinceStart: 65428,
      expectedScore: 474,
    },
    {
      name: 'vmquacks-combinator',
      firstSolveTime: 1722108397000,
      timeSinceStart: 69997,
      expectedScore: 507,
    },
    {
      name: 'its-just-a-dos-bug-bro',
      firstSolveTime: 1722137196000,
      timeSinceStart: 98796,
      expectedScore: 715,
    },
    {
      name: 'msfrogofwar3',
      firstSolveTime: 1722154629000,
      timeSinceStart: 116229,
      expectedScore: 841,
    },
    {
      name: 'corchat v3',
      firstSolveTime: 1722156974000,
      timeSinceStart: 118574,
      expectedScore: 858,
    },
    {
      name: 'sooolana',
      firstSolveTime: 1722161602000,
      timeSinceStart: 123202,
      expectedScore: 892,
    },
    {
      name: 'iframe-note',
      firstSolveTime: 1722187691000,
      timeSinceStart: 149291,
      expectedScore: 1000,
    },
    {
      name: 'repayment-pal',
      firstSolveTime: 1722211200000,
      timeSinceStart: 172800,
      expectedScore: 1000,
    },
  ]

  describe('matches reference implementation scores', () => {
    for (const tc of testCases) {
      test(`${tc.name} (t=${tc.timeSinceStart}s) should score ${tc.expectedScore}`, () => {
        const ctx = createContext(tc.firstSolveTime)
        const score = provider.calculate(ctx)
        expect(score).toBe(tc.expectedScore)
      })
    }
  })

  describe('edge cases', () => {
    test('unsolved challenge returns maxPoints', () => {
      const ctx = createContext(null)
      const score = provider.calculate(ctx)
      expect(score).toBe(maxPoints)
    })

    test('solve exactly at event start returns minPoints', () => {
      const ctx = createContext(eventStartTime)
      const score = provider.calculate(ctx)
      expect(score).toBe(minPoints)
    })

    test('solve exactly at event end returns maxPoints (capped)', () => {
      const ctx = createContext(eventEndTime)
      const score = provider.calculate(ctx)
      expect(score).toBe(maxPoints)
    })

    test('solve at maximumScoreTime returns maxPoints', () => {
      // At 80% of event (0.8 * 172800 = 138240 seconds)
      const maximumScoreTimeMs =
        eventStartTime + maximumScoreTime * (eventEndTime - eventStartTime)
      const ctx = createContext(maximumScoreTimeMs)
      const score = provider.calculate(ctx)
      expect(score).toBe(maxPoints)
    })

    test('zero eventLength returns maxPoints', () => {
      const zeroLengthProvider = new JammyProvider({ maximumScoreTime: 0.8 })
      const ctx: ScoreContext = {
        minPoints: 1,
        maxPoints: 1000,
        solves: 0,
        maxSolves: 0,
        eventStartTime: 1000,
        eventEndTime: 1000,
        firstSolveTime: 1000,
      }
      const score = zeroLengthProvider.calculate(ctx)
      expect(score).toBe(1000)
    })

    test('zero maxPoints returns maxPoints (0)', () => {
      const ctx: ScoreContext = {
        minPoints: 0,
        maxPoints: 0,
        solves: 0,
        maxSolves: 0,
        eventStartTime,
        eventEndTime,
        firstSolveTime: eventStartTime + 1000,
      }
      const score = provider.calculate(ctx)
      expect(score).toBe(0)
    })
  })

  describe('different maximumScoreTime values', () => {
    test('maximumScoreTime=0.5 reaches maxPoints at 50% of event', () => {
      const provider50 = new JammyProvider({ maximumScoreTime: 0.5 })
      const halfwayTime = eventStartTime + 0.5 * (eventEndTime - eventStartTime)
      const ctx = createContext(halfwayTime)
      const score = provider50.calculate(ctx)
      expect(score).toBe(maxPoints)
    })

    test('maximumScoreTime=1.0 reaches maxPoints at 100% of event', () => {
      const provider100 = new JammyProvider({ maximumScoreTime: 1.0 })
      const ctx = createContext(eventEndTime)
      const score = provider100.calculate(ctx)
      expect(score).toBe(maxPoints)
    })

    test('default maximumScoreTime is 0.8', () => {
      const defaultProvider = new JammyProvider({})
      // At 80% of event, should reach maxPoints
      const time80 = eventStartTime + 0.8 * (eventEndTime - eventStartTime)
      const ctx = createContext(time80)
      const score = defaultProvider.calculate(ctx)
      expect(score).toBe(maxPoints)
    })
  })

  describe('requiredFields', () => {
    test('declares correct required fields', () => {
      expect(provider.requiredFields).toContain('minPoints')
      expect(provider.requiredFields).toContain('maxPoints')
      expect(provider.requiredFields).toContain('eventStartTime')
      expect(provider.requiredFields).toContain('eventEndTime')
      expect(provider.requiredFields).toContain('firstSolveTime')
      expect(provider.requiredFields).not.toContain('solves')
      expect(provider.requiredFields).not.toContain('maxSolves')
    })
  })
})
