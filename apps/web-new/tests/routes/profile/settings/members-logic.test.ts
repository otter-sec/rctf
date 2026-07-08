import type { Member } from '@rctf/types'
import {
  diffMemberChange,
  isValidEmail,
} from '$routes/profile/settings/members-logic'
import { describe, expect, test } from 'bun:test'

const members: Member[] = [
  { id: 'member-1', userid: 'user-1', email: 'a@osec.io' },
  { id: 'member-2', userid: 'user-2', email: 'b@osec.io' },
]

const emails = members.map(member => member.email)

describe('isValidEmail', () => {
  test('accepts a well-formed address and trims first', () => {
    expect(isValidEmail('  team@osec.io  ')).toBe(true)
  })

  test('rejects addresses missing an @ or domain dot', () => {
    expect(isValidEmail('team')).toBe(false)
    expect(isValidEmail('team@osec')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('diffMemberChange', () => {
  test('an added email produces a single add with the trimmed value', () => {
    expect(diffMemberChange(emails, [...emails, 'c@osec.io'], members)).toEqual(
      {
        kind: 'add',
        email: 'c@osec.io',
      }
    )
  })

  test('a removed chip produces a delete keyed by membership id, not email', () => {
    expect(diffMemberChange(emails, ['a@osec.io'], members)).toEqual({
      kind: 'remove',
      id: 'member-2',
    })
  })

  test('add wins when a change looks like both an add and a remove', () => {
    expect(
      diffMemberChange(emails, ['a@osec.io', 'c@osec.io'], members)
    ).toEqual({
      kind: 'add',
      email: 'c@osec.io',
    })
  })

  test('an unchanged list is a no-op', () => {
    expect(diffMemberChange(emails, [...emails], members)).toEqual({
      kind: 'none',
    })
  })

  test('a removed email with no matching membership is a no-op', () => {
    expect(diffMemberChange(['ghost@osec.io'], [], members)).toEqual({
      kind: 'none',
    })
  })
})
