import {
  SubmissionKind,
  SubmissionResult,
  SubmissionTeamStatus,
} from '@rctf/types'
import {
  clearFilter,
  clearSearchFilter,
  toggleFilterOption,
} from '$lib/filters/core'
import {
  defineValueFilterFamily,
  type FilterOptionView,
  type ValueFilterFamily,
} from '$lib/filters/ui'
import {
  IconAwardFilled,
  IconCheckCircle,
  IconFlagBannerFold,
  IconGavel,
  IconLayoutListFilled,
  IconPuzzlePiece,
  IconRobot,
  IconTableFilled,
  IconUsersThree,
} from '$lib/icons'
import { getCategoryConfig } from '$lib/utils/categories'
import {
  KIND_OPTIONS,
  kindLabel,
  RESULT_OPTIONS,
  resultLabel,
  resultTone,
  TEAM_STATUS_OPTIONS,
  teamStatusLabel,
  type CategoryOption,
  type ChallengeOption,
  type DivisionOption,
  type SubmissionFilters,
  type TeamOption,
} from './submissions-model'

export type SubmissionFamiliesContext = {
  filters: SubmissionFilters
  challengeOptions: readonly ChallengeOption[]
  allChallengeOptions: readonly ChallengeOption[]
  teamOptions: readonly TeamOption[]
  categoryOptions: readonly CategoryOption[]
  divisionOptions: readonly DivisionOption[]
  challengesLoading: () => boolean
  teamOptionsLoading: () => boolean
}

export function createSubmissionValueFilterFamilies(
  context: SubmissionFamiliesContext
): ValueFilterFamily[] {
  return [
    challengeFamily(context),
    teamFamily(context),
    kindFamily(context.filters),
    resultFamily(context.filters),
    teamStatusFamily(context.filters),
    categoryFamily(context),
    divisionFamily(context),
  ]
}

function challengeFamily({
  filters,
  challengeOptions,
  allChallengeOptions,
  challengesLoading,
}: SubmissionFamiliesContext) {
  return defineValueFilterFamily<ChallengeOption>({
    id: 'challenge',
    label: 'Challenge',
    pluralLabel: 'challenges',
    icon: IconPuzzlePiece,
    menuSize: 'search',
    chipWidth: 'challenge',
    search: {
      value: () => filters.challenge.search,
      placeholder: 'Filter challenges...',
      onInput: value => (filters.challenge.search = value),
    },
    options: () => challengeOptions,
    rootSearchOptions: () => allChallengeOptions,
    optionKey: challenge => challenge.id,
    optionSearchValues: challenge => [
      challenge.name,
      challenge.category,
      getCategoryConfig(challenge.category).name,
    ],
    optionSelected: challenge =>
      filters.challenge.selected.some(item => item.id === challenge.id),
    toggleOption: challenge =>
      toggleFilterOption(filters.challenge, challenge, item => item.id),
    optionView: challengeOptionView,
    clear: () => clearSearchFilter(filters.challenge),
    loading: challengesLoading,
    loadingLabel: 'Loading challenges...',
    emptyLabel: 'No challenges found',
  })
}

function teamFamily({
  filters,
  teamOptions,
  teamOptionsLoading,
}: SubmissionFamiliesContext) {
  return defineValueFilterFamily<TeamOption>({
    id: 'team',
    label: 'Team',
    pluralLabel: 'teams',
    icon: IconUsersThree,
    menuSize: 'search',
    chipWidth: 'team',
    search: {
      value: () => filters.team.search,
      placeholder: 'Search teams...',
      onInput: value => (filters.team.search = value),
    },
    options: () => teamOptions,
    rootSearchOptions: () => teamOptions,
    optionKey: team => team.id,
    optionSearchValues: team => [team.name],
    optionSelected: team =>
      filters.team.selected.some(item => item.id === team.id),
    toggleOption: team =>
      toggleFilterOption(filters.team, team, item => item.id),
    optionView: teamOptionView,
    clear: () => clearSearchFilter(filters.team),
    loading: teamOptionsLoading,
    loadingLabel: 'Searching teams...',
    emptyLabel: 'Type to search teams',
  })
}

function kindFamily(filters: SubmissionFilters) {
  return defineValueFilterFamily<SubmissionKind>({
    id: 'kind',
    label: 'Kind',
    pluralLabel: 'kinds',
    icon: IconFlagBannerFold,
    menuSize: 'narrow',
    options: () => KIND_OPTIONS,
    optionKey: kind => kind,
    optionSearchValues: kind => [kindLabel(kind), kind],
    optionSelected: kind => filters.kind.selected.includes(kind),
    toggleOption: kind => toggleFilterOption(filters.kind, kind, item => item),
    optionView: kindOptionView,
    clear: () => clearFilter(filters.kind),
    emptyLabel: 'No kinds found',
  })
}

function resultFamily(filters: SubmissionFilters) {
  return defineValueFilterFamily<SubmissionResult>({
    id: 'result',
    label: 'Result',
    pluralLabel: 'results',
    icon: IconTableFilled,
    menuSize: 'medium',
    options: () => RESULT_OPTIONS,
    optionKey: result => result,
    optionSearchValues: result => [resultLabel(result), result],
    optionSelected: result => filters.result.selected.includes(result),
    toggleOption: result =>
      toggleFilterOption(filters.result, result, item => item),
    optionView: resultOptionView,
    clear: () => clearFilter(filters.result),
    emptyLabel: 'No results found',
  })
}

function teamStatusFamily(filters: SubmissionFilters) {
  return defineValueFilterFamily<SubmissionTeamStatus>({
    id: 'teamStatus',
    label: 'Team status',
    pluralLabel: 'statuses',
    icon: IconGavel,
    menuSize: 'medium',
    options: () => TEAM_STATUS_OPTIONS,
    optionKey: status => status,
    optionSearchValues: status => [teamStatusLabel(status), status],
    optionSelected: status => filters.teamStatus.selected.includes(status),
    toggleOption: status =>
      toggleFilterOption(filters.teamStatus, status, item => item),
    optionView: teamStatusOptionView,
    clear: () => clearFilter(filters.teamStatus),
    emptyLabel: 'No statuses found',
  })
}

function categoryFamily({
  filters,
  categoryOptions,
  challengesLoading,
}: SubmissionFamiliesContext) {
  return defineValueFilterFamily<CategoryOption>({
    id: 'category',
    label: 'Category',
    pluralLabel: 'categories',
    icon: IconLayoutListFilled,
    menuSize: 'medium',
    options: () => categoryOptions,
    optionKey: category => category.value,
    optionSearchValues: category => [
      category.label,
      category.value,
      getCategoryConfig(category.value).name,
    ],
    optionSelected: category =>
      filters.category.selected.some(item => item.value === category.value),
    toggleOption: category =>
      toggleFilterOption(filters.category, category, item => item.value),
    optionView: categoryOptionView,
    clear: () => clearFilter(filters.category),
    loading: challengesLoading,
    loadingLabel: 'Loading categories...',
    emptyLabel: 'No categories found',
  })
}

function divisionFamily({
  filters,
  divisionOptions,
}: SubmissionFamiliesContext) {
  return defineValueFilterFamily<DivisionOption>({
    id: 'division',
    label: 'Division',
    pluralLabel: 'divisions',
    icon: IconAwardFilled,
    menuSize: 'medium',
    options: () => divisionOptions,
    optionKey: division => division.value,
    optionSearchValues: division => [division.label, division.value],
    optionSelected: division =>
      filters.division.selected.some(item => item.value === division.value),
    toggleOption: division =>
      toggleFilterOption(filters.division, division, item => item.value),
    optionView: divisionOptionView,
    clear: () => clearFilter(filters.division),
    emptyLabel: 'No divisions found',
  })
}

function challengeOptionView(challenge: ChallengeOption): FilterOptionView {
  return {
    textValue: `${challenge.category} ${challenge.name}`,
    categoryColor: getCategoryConfig(challenge.category).color,
    segments: [
      { text: `${challenge.category} / `, tone: 'categoryMuted' },
      { text: challenge.name, tone: 'category' },
    ],
  }
}

function teamOptionView(team: TeamOption): FilterOptionView {
  return {
    textValue: team.name,
    avatar: { name: team.name, avatarUrl: team.avatarUrl },
    segments: [{ text: team.name }],
  }
}

function kindOptionView(kind: SubmissionKind): FilterOptionView {
  return {
    textValue: kindLabel(kind),
    icon: kind === SubmissionKind.ADMIN_BOT ? IconRobot : IconFlagBannerFold,
    segments: [{ text: kindLabel(kind) }],
  }
}

function resultOptionView(result: SubmissionResult): FilterOptionView {
  return {
    textValue: resultLabel(result),
    resultTone: resultTone(result),
    segments: [{ text: resultLabel(result), tone: 'result' }],
  }
}

function teamStatusOptionView(status: SubmissionTeamStatus): FilterOptionView {
  return {
    textValue: teamStatusLabel(status),
    icon: status === SubmissionTeamStatus.BANNED ? IconGavel : IconCheckCircle,
    segments: [{ text: teamStatusLabel(status) }],
  }
}

function categoryOptionView(category: CategoryOption): FilterOptionView {
  const config = getCategoryConfig(category.value)
  return {
    textValue: category.label,
    categoryColor: config.color,
    icon: config.icon,
    iconTone: 'category',
    segments: [{ text: category.label, tone: 'category' }],
  }
}

function divisionOptionView(division: DivisionOption): FilterOptionView {
  return {
    textValue: division.label,
    segments: [{ text: division.label }],
  }
}
