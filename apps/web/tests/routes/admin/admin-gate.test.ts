import { Permissions } from '@rctf/types'
import { decideAdminGate } from '$routes/admin/admin-gate'
import { describe, expect, test } from 'bun:test'

describe('decideAdminGate', () => {
  test('logged out when user is null', () => {
    expect(decideAdminGate(null)).toBe('loggedOut')
  })

  test('logged out when user is undefined', () => {
    expect(decideAdminGate(undefined)).toBe('loggedOut')
  })

  test('accepts each permission that owns an admin page', () => {
    expect(decideAdminGate({ perms: Permissions.challsRead })).toBe('ok')
    expect(decideAdminGate({ perms: Permissions.usersWrite })).toBe('ok')
    expect(decideAdminGate({ perms: Permissions.settingsWrite })).toBe('ok')
  })

  test('no perms when perms is zero or nullish', () => {
    expect(decideAdminGate({ perms: 0 })).toBe('noPerms')
    expect(decideAdminGate({ perms: null })).toBe('noPerms')
  })

  test('rejects permissions that do not own an admin page', () => {
    expect(decideAdminGate({ perms: Permissions.leaderboardRead })).toBe(
      'noPerms'
    )
    expect(decideAdminGate({ perms: Permissions.challsWrite })).toBe('noPerms')
    expect(decideAdminGate({ perms: Permissions.challsSolveWrite })).toBe(
      'noPerms'
    )
  })

  test('ok when multiple admin permission bits are set', () => {
    expect(
      decideAdminGate({
        perms: Permissions.challsRead | Permissions.usersWrite,
      })
    ).toBe('ok')
  })
})
