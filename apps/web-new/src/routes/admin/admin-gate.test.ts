import { Permissions } from '@rctf/types'
import { describe, expect, test } from 'bun:test'
import { decideAdminGate } from './admin-gate'

describe('decideAdminGate', () => {
  test('logged out when user is null', () => {
    expect(decideAdminGate(null)).toBe('loggedOut')
  })

  test('logged out when user is undefined', () => {
    expect(decideAdminGate(undefined)).toBe('loggedOut')
  })

  test('no perms when the challsRead bit is missing', () => {
    expect(decideAdminGate({ perms: Permissions.usersWrite })).toBe('noPerms')
  })

  test('no perms when perms is zero or nullish', () => {
    expect(decideAdminGate({ perms: 0 })).toBe('noPerms')
    expect(decideAdminGate({ perms: null })).toBe('noPerms')
  })

  test('ok when the challsRead bit is set', () => {
    expect(decideAdminGate({ perms: Permissions.challsRead })).toBe('ok')
    expect(
      decideAdminGate({
        perms: Permissions.challsRead | Permissions.usersWrite,
      })
    ).toBe('ok')
  })
})
