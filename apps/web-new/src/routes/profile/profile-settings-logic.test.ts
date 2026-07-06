import { describe, expect, it } from 'bun:test'
import {
  allowedDivisionOptions,
  canDeleteCtftime,
  canDeleteEmail,
  decideEmailBranch,
  emailButtonLabel,
  isEmailDirty,
  isEmailValid,
  isProfileDirty,
  type ProfileCurrentUser,
} from './profile-settings-logic'

const user: ProfileCurrentUser = {
  name: 'otter-sec',
  division: 'open',
  countryCode: 'US',
  statusText: 'Qualified',
}

describe('isProfileDirty', () => {
  it('is clean when the form mirrors the current user', () => {
    expect(
      isProfileDirty(
        {
          name: 'otter-sec',
          division: 'open',
          countryCode: 'US',
          statusText: 'Qualified',
        },
        user
      )
    ).toBe(false)
  })

  it('is dirty on a changed name', () => {
    expect(isProfileDirty({ ...user, name: 'renamed' }, user)).toBe(true)
  })

  it('is dirty on a changed division', () => {
    expect(isProfileDirty({ ...user, division: 'student' }, user)).toBe(true)
  })

  it('is dirty on a changed country', () => {
    expect(isProfileDirty({ ...user, countryCode: 'CA' }, user)).toBe(true)
  })

  it('is dirty on a changed status', () => {
    expect(isProfileDirty({ ...user, statusText: 'new status' }, user)).toBe(
      true
    )
  })

  it('treats a missing name field as an empty string', () => {
    const fresh: ProfileCurrentUser = { ...user, name: '' }
    expect(
      isProfileDirty(
        { division: 'open', countryCode: 'US', statusText: 'Qualified' },
        fresh
      )
    ).toBe(false)
  })

  it('treats null and undefined country/status as equal to a null current value', () => {
    const nulled: ProfileCurrentUser = {
      name: 'otter-sec',
      division: 'open',
      countryCode: null,
      statusText: null,
    }
    expect(
      isProfileDirty({ name: 'otter-sec', division: 'open' }, nulled)
    ).toBe(false)
    expect(
      isProfileDirty(
        {
          name: 'otter-sec',
          division: 'open',
          countryCode: null,
          statusText: null,
        },
        nulled
      )
    ).toBe(false)
  })
})

describe('isEmailValid', () => {
  it('accepts an empty field (means remove)', () => {
    expect(isEmailValid('')).toBe(true)
    expect(isEmailValid(undefined)).toBe(true)
  })

  it('accepts a well-formed address', () => {
    expect(isEmailValid('team@osec.io')).toBe(true)
  })

  it('rejects a malformed address', () => {
    expect(isEmailValid('not-an-email')).toBe(false)
    expect(isEmailValid('a@b')).toBe(false)
  })

  it('rejects a whitespace-only field (non-empty but trims to nothing)', () => {
    expect(isEmailValid('   ')).toBe(false)
  })
})

describe('isEmailDirty', () => {
  it('is clean when unchanged', () => {
    expect(isEmailDirty('team@osec.io', 'team@osec.io')).toBe(false)
  })

  it('treats an empty field and a null current email as equal', () => {
    expect(isEmailDirty('', null)).toBe(false)
    expect(isEmailDirty(undefined, null)).toBe(false)
  })

  it('is dirty when clearing an existing email', () => {
    expect(isEmailDirty('', 'team@osec.io')).toBe(true)
  })
})

describe('decideEmailBranch', () => {
  it('deletes when empty and removal is allowed', () => {
    expect(decideEmailBranch('', true)).toBe('delete')
    expect(decideEmailBranch('   ', true)).toBe('delete')
  })

  it('does nothing when empty and removal is not allowed', () => {
    expect(decideEmailBranch('', false)).toBe('none')
  })

  it('blocks an invalid non-empty address', () => {
    expect(decideEmailBranch('nope', false)).toBe('invalid')
    expect(decideEmailBranch('nope', true)).toBe('invalid')
  })

  it('puts a valid address', () => {
    expect(decideEmailBranch('team@osec.io', false)).toBe('put')
    expect(decideEmailBranch('team@osec.io', true)).toBe('put')
  })
})

describe('canDeleteEmail', () => {
  it('is true only with email enabled, an email set, and CTFtime linked', () => {
    expect(canDeleteEmail(true, 'team@osec.io', '123')).toBe(true)
  })

  it('is false when email is the only auth method (no CTFtime)', () => {
    expect(canDeleteEmail(true, 'team@osec.io', null)).toBe(false)
  })

  it('is false when email is disabled or unset', () => {
    expect(canDeleteEmail(false, 'team@osec.io', '123')).toBe(false)
    expect(canDeleteEmail(true, null, '123')).toBe(false)
  })
})

describe('canDeleteCtftime', () => {
  it('is true only with CTFtime configured, linked, and an email set', () => {
    expect(canDeleteCtftime(true, '123', 'team@osec.io')).toBe(true)
  })

  it('is false when CTFtime is the only auth method (no email)', () => {
    expect(canDeleteCtftime(true, '123', null)).toBe(false)
  })
})

describe('emailButtonLabel', () => {
  it('reads "Remove email" when clearing a removable email', () => {
    expect(emailButtonLabel('', true)).toBe('Remove email')
    expect(emailButtonLabel('   ', true)).toBe('Remove email')
  })

  it('reads "Update email" when a value is present or removal is not offered', () => {
    expect(emailButtonLabel('team@osec.io', true)).toBe('Update email')
    expect(emailButtonLabel('', false)).toBe('Update email')
  })
})

describe('allowedDivisionOptions', () => {
  it('intersects the config divisions with the allowed set', () => {
    const divisions = { open: 'Open', student: 'Student', pro: 'Pro' }
    expect(allowedDivisionOptions(divisions, ['open', 'student'])).toEqual([
      { value: 'open', label: 'Open' },
      { value: 'student', label: 'Student' },
    ])
  })

  it('returns a single option when only one division is allowed', () => {
    expect(
      allowedDivisionOptions({ open: 'Open', pro: 'Pro' }, ['open'])
    ).toEqual([{ value: 'open', label: 'Open' }])
  })
})
