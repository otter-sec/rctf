import type { CategoryColor, IconComponent } from '$lib/utils/categories'
import type { MultiFilter } from './core'

export type ValueFilterOption = unknown

export type ValueFilterId = string

export type ResultTone = 'success' | 'warning' | 'danger'

export type TeamFilterOption = {
  id: string
  name: string
  avatarUrl: string | null
}

export type FilterOptionSegmentTone = 'category' | 'categoryMuted' | 'result'
export type FilterOptionIconTone = 'category'

export type FilterOptionSegment = {
  text: string
  tone?: FilterOptionSegmentTone
}

export type FilterOptionView = {
  textValue: string
  segments: FilterOptionSegment[]
  categoryColor?: CategoryColor
  icon?: IconComponent
  iconTone?: FilterOptionIconTone
  avatar?: {
    name: string
    avatarUrl: string | null
  }
  resultTone?: ResultTone
}

export type ValueFilterFamilySearch = {
  value: () => string
  placeholder: string
  onInput: (value: string) => void
}

export type ValueFilterFamily = {
  id: ValueFilterId
  label: string
  pluralLabel: string
  icon: IconComponent
  menuSize: 'search' | 'narrow' | 'medium'
  chipWidth?: 'challenge' | 'team'
  searchTerms?: readonly string[]
  clear: () => void
  search?: ValueFilterFamilySearch
  options: () => readonly ValueFilterOption[]
  rootSearchOptions?: () => readonly ValueFilterOption[]
  optionKey: (option: ValueFilterOption) => string
  optionSearchValues: (option: ValueFilterOption) => readonly string[]
  optionSelected: (option: ValueFilterOption) => boolean
  toggleOption: (option: ValueFilterOption) => void
  optionView: (option: ValueFilterOption) => FilterOptionView
  loading?: () => boolean
  loadingLabel?: string
  emptyLabel: string
}

export type TimeFilterFamily = {
  id: 'time'
  label: string
  icon: IconComponent
  searchTerms: readonly string[]
}

export type TypedValueFilterFamily<T extends ValueFilterOption> = Omit<
  ValueFilterFamily,
  | 'options'
  | 'rootSearchOptions'
  | 'optionKey'
  | 'optionSearchValues'
  | 'optionSelected'
  | 'toggleOption'
  | 'optionView'
> & {
  options: () => readonly T[]
  rootSearchOptions?: () => readonly T[]
  optionKey: (option: T) => string
  optionSearchValues: (option: T) => readonly string[]
  optionSelected: (option: T) => boolean
  toggleOption: (option: T) => void
  optionView: (option: T) => FilterOptionView
}

export type RootFilterOptionMatch = {
  family: ValueFilterFamily
  key: string
  option: ValueFilterOption
}

export const PAGE_SIZE = 100
export const ROW_HEIGHT = 48
export const ROOT_SEARCH_MATCH_LIMIT = 8

export function defineValueFilterFamily<T extends ValueFilterOption>(
  family: TypedValueFilterFamily<T>
): ValueFilterFamily {
  return family as unknown as ValueFilterFamily
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}

export function searchMatches(query: string, ...values: string[]): boolean {
  if (!query) return false
  return values.some(value => normalizeSearchText(value).includes(query))
}

export function rootFilterFamilyMatchesSearch(
  family: ValueFilterFamily | TimeFilterFamily,
  query: string
): boolean {
  const pluralLabel = 'pluralLabel' in family ? family.pluralLabel : ''
  const extraTerms = query.length > 1 ? (family.searchTerms ?? []) : []
  return searchMatches(query, family.label, pluralLabel, ...extraTerms)
}

export function uniqueTeamOptions(
  teams: { id: string; name: string; avatarUrl: string | null }[]
): TeamFilterOption[] {
  const seen = new Set<string>()

  return teams
    .filter(team => {
      if (seen.has(team.id)) return false
      seen.add(team.id)
      return true
    })
    .map(team => ({
      id: team.id,
      name: team.name,
      avatarUrl: team.avatarUrl,
    }))
}

export function rootSearchMatchesForFamily(
  family: ValueFilterFamily,
  query: string
): RootFilterOptionMatch[] {
  const options = family.rootSearchOptions?.() ?? family.options()

  return options
    .filter(option =>
      searchMatches(query, ...family.optionSearchValues(option))
    )
    .slice(0, ROOT_SEARCH_MATCH_LIMIT)
    .map(option => ({
      family,
      key: family.optionKey(option),
      option,
    }))
}

export function rootFilterOptionKey(match: RootFilterOptionMatch): string {
  return `${match.family.id}:${match.key}`
}

export function valueFilterSummary(
  family: ValueFilterFamily,
  filter: MultiFilter<unknown>
): string {
  if (filter.selected.length === 0) return ''
  if (filter.selected.length === 1) {
    const selected = filter.selected[0]
    if (selected !== undefined) return family.optionView(selected).textValue
  }
  return `${filter.selected.length} ${family.pluralLabel}`
}
