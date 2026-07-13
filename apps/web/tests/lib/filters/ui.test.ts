import {
  createFilter,
  filterOperatorLabel,
  type MultiFilter,
} from '$lib/filters/core'
import {
  defineValueFilterFamily,
  normalizeSearchText,
  ROOT_SEARCH_MATCH_LIMIT,
  rootFilterFamilyMatchesSearch,
  rootFilterOptionKey,
  rootSearchMatchesForFamily,
  searchMatches,
  uniqueTeamOptions,
  valueFilterSummary,
  type TeamFilterOption,
  type ValueFilterFamily,
} from '$lib/filters/ui'
import { describe, expect, test } from 'bun:test'

type StringOption = { id: string; label: string }

function stringFamily(
  overrides: Partial<ValueFilterFamily> & {
    options?: () => readonly StringOption[]
  } = {}
): ValueFilterFamily {
  const options = overrides.options ?? (() => [])
  return defineValueFilterFamily<StringOption>({
    id: 'kind',
    label: 'Kind',
    pluralLabel: 'kinds',
    icon: (() => null) as never,
    menuSize: 'narrow',
    clear: () => {},
    emptyLabel: 'No kinds',
    options,
    optionKey: option => option.id,
    optionSearchValues: option => [option.label, option.id],
    optionSelected: () => false,
    toggleOption: () => {},
    optionView: option => ({
      textValue: option.label,
      segments: [{ text: option.label }],
    }),
    ...(overrides as object),
  })
}

describe('normalizeSearchText', () => {
  test('trims and lowercases', () => {
    expect(normalizeSearchText('  Hello World  ')).toBe('hello world')
  })
})

describe('searchMatches', () => {
  test('empty query never matches', () => {
    expect(searchMatches('', 'anything')).toBe(false)
  })

  test('matches a substring case-insensitively across values', () => {
    expect(searchMatches('web', 'Cloud', 'Web Exploitation')).toBe(true)
    expect(searchMatches('web', 'Cloud', 'Crypto')).toBe(false)
  })
})

describe('rootFilterFamilyMatchesSearch', () => {
  const family = stringFamily({
    label: 'Challenge',
    pluralLabel: 'challenges',
    searchTerms: ['task', 'problem'],
  })

  test('matches by label and plural label', () => {
    expect(rootFilterFamilyMatchesSearch(family, 'chall')).toBe(true)
    expect(rootFilterFamilyMatchesSearch(family, 'challenges')).toBe(true)
  })

  test('only consults searchTerms once the query is longer than one char', () => {
    expect(rootFilterFamilyMatchesSearch(family, 't')).toBe(false)
    expect(rootFilterFamilyMatchesSearch(family, 'ta')).toBe(true)
  })
})

describe('rootSearchMatchesForFamily', () => {
  test('returns matched options tagged with family and key', () => {
    const family = stringFamily({
      options: () => [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
    })
    const matches = rootSearchMatchesForFamily(family, 'alp')
    expect(matches).toEqual([
      { family, key: 'a', option: { id: 'a', label: 'Alpha' } },
    ])
  })

  test('caps results per family at the match limit', () => {
    const options = Array.from({ length: 20 }, (_, index) => ({
      id: `m${index}`,
      label: `Match ${index}`,
    }))
    const family = stringFamily({ options: () => options })
    expect(rootSearchMatchesForFamily(family, 'match')).toHaveLength(
      ROOT_SEARCH_MATCH_LIMIT
    )
  })

  test('prefers rootSearchOptions over options when present', () => {
    const family = stringFamily({
      options: () => [{ id: 'a', label: 'Alpha' }],
      rootSearchOptions: () => [{ id: 'z', label: 'Alpha Zulu' }],
    })
    const matches = rootSearchMatchesForFamily(family, 'zulu')
    expect(matches.map(match => match.key)).toEqual(['z'])
  })
})

describe('rootFilterOptionKey', () => {
  test('namespaces the option key under its family id', () => {
    const family = stringFamily({ id: 'team' })
    expect(
      rootFilterOptionKey({
        family,
        key: 'abc',
        option: { id: 'abc', label: 'x' },
      })
    ).toBe('team:abc')
  })
})

describe('valueFilterSummary', () => {
  const family = stringFamily({ pluralLabel: 'kinds' })

  test('is empty when nothing is selected', () => {
    const filter: MultiFilter<StringOption> = createFilter()
    expect(valueFilterSummary(family, filter)).toBe('')
  })

  test('shows the single option label', () => {
    const filter: MultiFilter<StringOption> = {
      mode: 'include',
      selected: [{ id: 'a', label: 'Alpha' }],
    }
    expect(valueFilterSummary(family, filter)).toBe('Alpha')
  })

  test('counts with the plural label past one selection', () => {
    const filter: MultiFilter<StringOption> = {
      mode: 'include',
      selected: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
    }
    expect(valueFilterSummary(family, filter)).toBe('2 kinds')
  })
})

describe('uniqueTeamOptions', () => {
  test('dedupes by id keeping the first occurrence', () => {
    const teams: TeamFilterOption[] = [
      { id: '1', name: 'One', avatarUrl: null },
      { id: '1', name: 'One again', avatarUrl: 'x' },
      { id: '2', name: 'Two', avatarUrl: null },
    ]
    expect(uniqueTeamOptions(teams)).toEqual([
      { id: '1', name: 'One', avatarUrl: null },
      { id: '2', name: 'Two', avatarUrl: null },
    ])
  })
})

describe('operator label integration', () => {
  test('reflects the family selection count', () => {
    const filter: MultiFilter<StringOption> = {
      mode: 'include',
      selected: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
    }
    expect(filterOperatorLabel(filter.mode, filter.selected.length)).toBe(
      'is any of'
    )
    expect(filterOperatorLabel('exclude', filter.selected.length)).toBe(
      'is not'
    )
  })
})
