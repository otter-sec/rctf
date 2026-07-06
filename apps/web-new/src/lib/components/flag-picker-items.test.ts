import { ALL_REGIONS } from '@rctf/util'
import { describe, expect, test } from 'bun:test'
import {
  buildRegionItems,
  fromComboboxValue,
  NO_COUNTRY_VALUE,
  toComboboxValue,
} from './flag-picker-items'

describe('buildRegionItems', () => {
  test('prepends the clear row before every region in order', () => {
    const items = buildRegionItems('No country')
    expect(items).toHaveLength(ALL_REGIONS.length + 1)
    expect(items[0]).toEqual({ value: NO_COUNTRY_VALUE, label: 'No country' })
    expect(items[1]).toEqual({
      value: ALL_REGIONS[0]!.code,
      label: ALL_REGIONS[0]!.name,
    })
  })

  test('uses region code as value and name as label', () => {
    const items = buildRegionItems('No country')
    const us = items.find(item => item.value === 'US')
    expect(us?.label).toBe(ALL_REGIONS.find(r => r.code === 'US')?.name)
  })
})

describe('value mapping', () => {
  test('toComboboxValue maps null to the clear sentinel', () => {
    expect(toComboboxValue(null)).toBe(NO_COUNTRY_VALUE)
    expect(toComboboxValue('US')).toBe('US')
  })

  test('fromComboboxValue maps the clear sentinel and null back to null', () => {
    expect(fromComboboxValue(NO_COUNTRY_VALUE)).toBeNull()
    expect(fromComboboxValue(null)).toBeNull()
    expect(fromComboboxValue('US')).toBe('US')
  })

  test('round-trips a country code and a cleared value', () => {
    expect(fromComboboxValue(toComboboxValue('DE'))).toBe('DE')
    expect(fromComboboxValue(toComboboxValue(null))).toBeNull()
  })
})
