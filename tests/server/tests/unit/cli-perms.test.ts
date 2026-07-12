import { ALL_PERMISSIONS, Permissions } from '@rctf/types'
import { describe, expect, test } from 'bun:test'
import { formatPerms, parsePermsList } from '../../../../apps/cli/src/lib/perms'

describe('ALL_PERMISSIONS', () => {
  test('is the union of every permission bit', () => {
    expect(ALL_PERMISSIONS).toBe(63)
  })
})

describe('parsePermsList', () => {
  test('parses a single permission name', () => {
    expect(parsePermsList('challsRead')).toBe(Permissions.challsRead)
  })

  test('combines comma-separated permission names', () => {
    expect(parsePermsList('challsRead,challsWrite')).toBe(
      Permissions.challsRead | Permissions.challsWrite
    )
  })

  test('ignores whitespace and empty entries', () => {
    expect(parsePermsList(' challsRead , usersWrite ,')).toBe(
      Permissions.challsRead | Permissions.usersWrite
    )
  })

  test('throws on an unknown permission name', () => {
    expect(() => parsePermsList('challsRead,bogus')).toThrow(
      /Unknown permission 'bogus'/
    )
  })

  test('rejects numeric values', () => {
    expect(() => parsePermsList('63')).toThrow(/Unknown permission '63'/)
  })
})

describe('formatPerms', () => {
  test('lists the set permission names with the numeric value', () => {
    expect(formatPerms(Permissions.challsRead | Permissions.challsWrite)).toBe(
      'challsRead,challsWrite (3)'
    )
  })

  test('formats zero perms as none', () => {
    expect(formatPerms(0)).toBe('none (0)')
  })

  test('formats a full admin', () => {
    expect(formatPerms(ALL_PERMISSIONS)).toBe(
      'challsRead,challsWrite,leaderboardRead,challsSolveWrite,usersWrite,settingsWrite (63)'
    )
  })
})
