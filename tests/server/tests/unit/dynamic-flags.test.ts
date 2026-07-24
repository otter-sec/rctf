import { DynamicFlagMode } from '@rctf/types'
import { describe, expect, test } from 'bun:test'
import {
  generateDynamicFlag,
  verifyDynamicFlag,
} from '../../../../apps/api/src/providers/flags'
import { DynamicFlagResult } from '../../../../apps/api/src/providers/flags/result'

// A base flag with plenty of leet-encodable ([a-z]) characters so that the
// 'leet' signing mode has enough capacity for the team id + signature bits.
const BASE = 'rctf{abcdefghijklmnopqrstuvwxyz}'
const KEY = 'signing-key'

const teamA = '11111111-1111-1111-1111-111111111111'
const teamB = '22222222-2222-2222-2222-222222222222'
const challX = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const challY = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('generateDynamicFlag / verifyDynamicFlag', () => {
  // Properties that hold for every signing mode.
  for (const mode of Object.values(DynamicFlagMode)) {
    describe(`mode: ${mode}`, () => {
      test('verify returns Valid for a freshly minted flag (round trip)', () => {
        const flag = generateDynamicFlag(BASE, teamA, challX, mode, KEY)
        expect(verifyDynamicFlag(BASE, teamA, challX, flag, mode, KEY)).toBe(
          DynamicFlagResult.Valid
        )
      })

      test('generation is deterministic', () => {
        const first = generateDynamicFlag(BASE, teamA, challX, mode, KEY)
        const second = generateDynamicFlag(BASE, teamA, challX, mode, KEY)
        expect(first).toBe(second)
      })

      test('output keeps the base flag format and is brace-delimited', () => {
        const flag = generateDynamicFlag(BASE, teamA, challX, mode, KEY)
        expect(flag.startsWith('rctf{')).toBe(true)
        expect(flag.endsWith('}')).toBe(true)
      })

      test("another team's flag is ValidBaseWrongTeamOrSig, not Valid", () => {
        const flagForA = generateDynamicFlag(BASE, teamA, challX, mode, KEY)
        // The base is a real minted flag, but the embedded team id/sig is team
        // A's, so submitting it as team B is the flag-sharing case (code 1).
        expect(
          verifyDynamicFlag(BASE, teamB, challX, flagForA, mode, KEY)
        ).toBe(DynamicFlagResult.ValidBaseWrongTeamOrSig)
        // ...and the two teams get distinct flags in the first place.
        const flagForB = generateDynamicFlag(BASE, teamB, challX, mode, KEY)
        expect(flagForA).not.toBe(flagForB)
      })

      test('a wrong signing key is ValidBaseWrongTeamOrSig', () => {
        const flag = generateDynamicFlag(BASE, teamA, challX, mode, KEY)
        // Same base + team, but the signature was computed with a different
        // key, so the signature bits no longer match (code 1).
        expect(
          verifyDynamicFlag(BASE, teamA, challX, flag, mode, 'other-key')
        ).toBe(DynamicFlagResult.ValidBaseWrongTeamOrSig)
      })

      test('a submission with no brace body is Invalid', () => {
        expect(
          verifyDynamicFlag(BASE, teamA, challX, 'no-braces-here', mode, KEY)
        ).toBe(DynamicFlagResult.Invalid)
      })
    })
  }

  describe('mode: leet', () => {
    test('the untransformed base flag is a valid variant (ValidBaseWrongTeamOrSig)', () => {
      // The all-lowercase base is a valid leetspeak rendering of itself, so it
      // reads as a well-formed flag with the wrong team/sig bits (code 1).
      expect(
        verifyDynamicFlag(BASE, teamA, challX, BASE, DynamicFlagMode.LEET, KEY)
      ).toBe(DynamicFlagResult.ValidBaseWrongTeamOrSig)
    })

    test('a same-length non-variant character is Invalid', () => {
      // First char replaced with 'x', which is not a leet variant of base 'a'.
      const bogus = 'rctf{xbcdefghijklmnopqrstuvwxyz}'
      expect(
        verifyDynamicFlag(BASE, teamA, challX, bogus, DynamicFlagMode.LEET, KEY)
      ).toBe(DynamicFlagResult.Invalid)
    })

    test('a wrong-length submission is Invalid', () => {
      expect(
        verifyDynamicFlag(
          BASE,
          teamA,
          challX,
          'rctf{short}',
          DynamicFlagMode.LEET,
          KEY
        )
      ).toBe(DynamicFlagResult.Invalid)
    })

    test('generation throws when the base has too few encodable characters', () => {
      expect(() =>
        generateDynamicFlag(
          'rctf{abc}',
          teamA,
          challX,
          DynamicFlagMode.LEET,
          KEY
        )
      ).toThrow()
    })
  })

  describe('mode: basic', () => {
    test('embeds the dash-stripped team id', () => {
      const flag = generateDynamicFlag(
        BASE,
        teamA,
        challX,
        DynamicFlagMode.BASIC,
        KEY
      )
      expect(flag.includes(teamA.replace(/-/g, ''))).toBe(true)
    })

    test('binds the flag to the challenge id (ValidBaseWrongTeamOrSig)', () => {
      // 'basic' mode folds the challenge id into the signature, so a flag
      // minted for one challenge has a valid base but a mismatched signature on
      // another.
      const flag = generateDynamicFlag(
        BASE,
        teamA,
        challX,
        DynamicFlagMode.BASIC,
        KEY
      )
      expect(
        verifyDynamicFlag(BASE, teamA, challY, flag, DynamicFlagMode.BASIC, KEY)
      ).toBe(DynamicFlagResult.ValidBaseWrongTeamOrSig)
    })

    test('a well-formed flag with the right base but forged tail is ValidBaseWrongTeamOrSig', () => {
      const forged = 'rctf{abcdefghijklmnopqrstuvwxyz:deadbeef:0000}'
      expect(
        verifyDynamicFlag(
          BASE,
          teamA,
          challX,
          forged,
          DynamicFlagMode.BASIC,
          KEY
        )
      ).toBe(DynamicFlagResult.ValidBaseWrongTeamOrSig)
    })

    test('the untransformed base flag is Invalid (no team/sig chunks)', () => {
      expect(
        verifyDynamicFlag(BASE, teamA, challX, BASE, DynamicFlagMode.BASIC, KEY)
      ).toBe(DynamicFlagResult.Invalid)
    })

    test('too few colon-separated chunks is Invalid', () => {
      const tooFew = 'rctf{abcdefghijklmnopqrstuvwxyz:onlyone}'
      expect(
        verifyDynamicFlag(
          BASE,
          teamA,
          challX,
          tooFew,
          DynamicFlagMode.BASIC,
          KEY
        )
      ).toBe(DynamicFlagResult.Invalid)
    })

    test('a different base body is Invalid', () => {
      const wrongBase = 'rctf{wrongbase:team:sig}'
      expect(
        verifyDynamicFlag(
          BASE,
          teamA,
          challX,
          wrongBase,
          DynamicFlagMode.BASIC,
          KEY
        )
      ).toBe(DynamicFlagResult.Invalid)
    })
  })

  describe('input validation', () => {
    test('generation throws on a base flag with no brace-delimited body', () => {
      expect(() =>
        generateDynamicFlag(
          'not-a-flag',
          teamA,
          challX,
          DynamicFlagMode.BASIC,
          KEY
        )
      ).toThrow()
    })

    test('verification throws on a base flag with no brace-delimited body', () => {
      expect(() =>
        verifyDynamicFlag(
          'not-a-flag',
          teamA,
          challX,
          'rctf{x}',
          DynamicFlagMode.BASIC,
          KEY
        )
      ).toThrow()
    })
  })
})
