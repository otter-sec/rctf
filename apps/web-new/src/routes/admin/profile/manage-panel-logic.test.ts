import { describe, expect, it } from 'bun:test'
import {
  buildUserUpdate,
  divisionOptions,
  isManageDirty,
  type ManageForm,
  type ManageOriginal,
} from './manage-panel-logic'

const baseForm: ManageForm = {
  name: 'otter-sec',
  division: 'open',
  countryCode: 'US',
  statusText: 'Qualified',
}

describe('buildUserUpdate', () => {
  it('passes populated fields through unchanged', () => {
    expect(buildUserUpdate(baseForm)).toEqual({
      name: 'otter-sec',
      division: 'open',
      countryCode: 'US',
      statusText: 'Qualified',
    })
  })

  it('clears a blank status to null', () => {
    expect(
      buildUserUpdate({ ...baseForm, statusText: '' }).statusText
    ).toBeNull()
  })

  it('clears a whitespace-only status to null', () => {
    expect(
      buildUserUpdate({ ...baseForm, statusText: '   ' }).statusText
    ).toBeNull()
  })

  it('treats an already-null status as a clear', () => {
    expect(
      buildUserUpdate({ ...baseForm, statusText: null }).statusText
    ).toBeNull()
  })

  it('preserves a null country code', () => {
    expect(
      buildUserUpdate({ ...baseForm, countryCode: null }).countryCode
    ).toBeNull()
  })
})

const original: ManageOriginal = {
  name: 'otter-sec',
  division: 'open',
  countryCode: 'US',
  statusText: 'Qualified',
}

describe('isManageDirty', () => {
  it('is false when the form matches the team', () => {
    expect(isManageDirty(baseForm, original)).toBe(false)
  })

  it('detects a changed name', () => {
    expect(isManageDirty({ ...baseForm, name: 'renamed' }, original)).toBe(true)
  })

  it('detects a changed division', () => {
    expect(isManageDirty({ ...baseForm, division: 'students' }, original)).toBe(
      true
    )
  })

  it('treats a null and blank status as equal', () => {
    expect(
      isManageDirty(
        { ...baseForm, statusText: null },
        { ...original, statusText: null }
      )
    ).toBe(false)
  })

  it('detects clearing a set status', () => {
    expect(isManageDirty({ ...baseForm, statusText: null }, original)).toBe(
      true
    )
  })

  it('treats a null and set country as different', () => {
    expect(isManageDirty({ ...baseForm, countryCode: null }, original)).toBe(
      true
    )
  })
})

describe('divisionOptions', () => {
  it('maps the division config to value/label pairs in order', () => {
    expect(divisionOptions({ open: 'Open', students: 'Students' })).toEqual([
      { value: 'open', label: 'Open' },
      { value: 'students', label: 'Students' },
    ])
  })

  it('returns an empty array for no divisions', () => {
    expect(divisionOptions({})).toEqual([])
  })
})
