import {
  SubmissionKind,
  SubmissionResult,
  SubmissionTeamStatus,
} from '@rctf/types'
import {
  IconFlag3Filled,
  IconGavel,
  IconLayoutListFilled,
  IconPuzzleFilled,
  IconRobot,
  IconShieldFilled,
  IconTableFilled,
  IconUsersGroup,
} from '$lib/icons'
import { getCategoryConfig, getCategoryStyle } from '$lib/utils'
import {
  defineValueFilterFamily,
  type FilterOptionView,
  type ValueFilterFamily,
} from './submissions-filter-ui'
import {
  clearFilter,
  clearSearchFilter,
  toggleFilterOption,
  type SubmissionFilters,
} from './submissions-filters'
import {
  KIND_FILTERS,
  kindLabel,
  RESULT_FILTERS,
  resultLabel,
  resultTone,
  TEAM_STATUS_FILTERS,
  teamStatusLabel,
  type CategoryFilterOption,
  type ChallengeFilterOption,
  type DivisionFilterOption,
  type TeamFilterOption,
} from './submissions-utils'

type SubmissionFilterFamilyContext = {
  filters: SubmissionFilters
  challengeOptions: readonly ChallengeFilterOption[]
  allChallengeOptions: readonly ChallengeFilterOption[]
  teamOptions: readonly TeamFilterOption[]
  rootTeamOptions: readonly TeamFilterOption[]
  categoryOptions: readonly CategoryFilterOption[]
  divisionOptions: readonly DivisionFilterOption[]
  challengesPending: () => boolean
  teamOptionsLoading: () => boolean
}

export function createSubmissionValueFilterFamilies(
  context: SubmissionFilterFamilyContext
) {
  return [
    challengeFilterFamily(context),
    teamFilterFamily(context),
    kindFilterFamily(context.filters),
    resultFilterFamily(context.filters),
    teamStatusFilterFamily(context.filters),
    categoryFilterFamily(context),
    divisionFilterFamily(context),
  ] satisfies ValueFilterFamily[]
}

function challengeFilterFamily({
  filters,
  challengeOptions,
  allChallengeOptions,
  challengesPending,
}: SubmissionFilterFamilyContext) {
  return defineValueFilterFamily<ChallengeFilterOption>({
    id: 'challenge',
    label: 'Challenge',
    pluralLabel: 'challenges',
    icon: IconPuzzleFilled,
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
    optionSearchValues: challenge => {
      const category = getCategoryConfig(challenge.category)
      return [challenge.name, challenge.category, category.name]
    },
    optionSelected: challenge =>
      filters.challenge.selected.some(item => item.id === challenge.id),
    toggleOption: challenge =>
      toggleFilterOption(filters.challenge, challenge, item => item.id),
    optionView: challengeOptionView,
    clear: () => clearSearchFilter(filters.challenge),
    loading: challengesPending,
    loadingLabel: 'Loading challenges...',
    emptyLabel: 'No challenges found',
  })
}

function teamFilterFamily({
  filters,
  teamOptions,
  rootTeamOptions,
  teamOptionsLoading,
}: SubmissionFilterFamilyContext) {
  return defineValueFilterFamily<TeamFilterOption>({
    id: 'team',
    label: 'Team',
    pluralLabel: 'teams',
    icon: IconUsersGroup,
    menuSize: 'search',
    chipWidth: 'team',
    search: {
      value: () => filters.team.search,
      placeholder: 'Filter teams...',
      onInput: value => (filters.team.search = value),
    },
    options: () => teamOptions,
    rootSearchOptions: () => rootTeamOptions,
    optionKey: team => team.id,
    optionSearchValues: team => [team.name],
    optionSelected: team =>
      filters.team.selected.some(item => item.id === team.id),
    toggleOption: team =>
      toggleFilterOption(filters.team, team, item => item.id),
    optionView: teamOptionView,
    clear: () => clearSearchFilter(filters.team),
    loading: teamOptionsLoading,
    loadingLabel: 'Loading teams...',
    emptyLabel: 'No teams found',
  })
}

function kindFilterFamily(filters: SubmissionFilters) {
  return defineValueFilterFamily<SubmissionKind>({
    id: 'kind',
    label: 'Kind',
    pluralLabel: 'kinds',
    icon: IconFlag3Filled,
    menuSize: 'narrow',
    options: () => KIND_FILTERS,
    optionKey: kind => kind,
    optionSearchValues: kind => [kindLabel(kind), kind],
    optionSelected: kind => filters.kind.selected.includes(kind),
    toggleOption: kind => toggleFilterOption(filters.kind, kind, item => item),
    optionView: kindOptionView,
    clear: () => clearFilter(filters.kind),
    emptyLabel: 'No kinds found',
  })
}

function resultFilterFamily(filters: SubmissionFilters) {
  return defineValueFilterFamily<SubmissionResult>({
    id: 'result',
    label: 'Result',
    pluralLabel: 'results',
    icon: IconTableFilled,
    menuSize: 'medium',
    options: () => RESULT_FILTERS,
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

function teamStatusFilterFamily(filters: SubmissionFilters) {
  return defineValueFilterFamily<SubmissionTeamStatus>({
    id: 'teamStatus',
    label: 'Team status',
    pluralLabel: 'statuses',
    icon: IconGavel,
    menuSize: 'medium',
    options: () => TEAM_STATUS_FILTERS,
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

function categoryFilterFamily({
  filters,
  categoryOptions,
  challengesPending,
}: SubmissionFilterFamilyContext) {
  return defineValueFilterFamily<CategoryFilterOption>({
    id: 'category',
    label: 'Category',
    pluralLabel: 'categories',
    icon: IconLayoutListFilled,
    menuSize: 'medium',
    options: () => categoryOptions,
    optionKey: category => category.value,
    optionSearchValues: category => {
      const config = getCategoryConfig(category.value)
      return [category.label, category.value, config.name]
    },
    optionSelected: category =>
      filters.category.selected.some(item => item.value === category.value),
    toggleOption: category =>
      toggleFilterOption(filters.category, category, item => item.value),
    optionView: categoryOptionView,
    clear: () => clearFilter(filters.category),
    loading: challengesPending,
    loadingLabel: 'Loading categories...',
    emptyLabel: 'No categories found',
  })
}

function divisionFilterFamily({
  filters,
  divisionOptions,
}: SubmissionFilterFamilyContext) {
  return defineValueFilterFamily<DivisionFilterOption>({
    id: 'division',
    label: 'Division',
    pluralLabel: 'divisions',
    icon: IconShieldFilled,
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

function challengeOptionView(
  challenge: ChallengeFilterOption
): FilterOptionView {
  const category = getCategoryConfig(challenge.category)

  return {
    textValue: `${challenge.category} ${challenge.name}`,
    style: getCategoryStyle(category.color),
    segments: [
      { text: `${challenge.category} / `, tone: 'categoryMuted' },
      { text: challenge.name, tone: 'category' },
    ],
  }
}

function teamOptionView(team: TeamFilterOption): FilterOptionView {
  return {
    textValue: team.name,
    avatar: {
      name: team.name,
      avatarUrl: team.avatarUrl,
    },
    segments: [{ text: team.name }],
  }
}

function kindOptionView(kind: SubmissionKind): FilterOptionView {
  return {
    textValue: kindLabel(kind),
    icon: kind === SubmissionKind.ADMIN_BOT ? IconRobot : IconFlag3Filled,
    segments: [{ text: kindLabel(kind) }],
  }
}

function resultOptionView(result: SubmissionResult): FilterOptionView {
  const tone = resultTone(result)

  return {
    textValue: resultLabel(result),
    resultTone: tone,
    segments: [{ text: resultLabel(result), tone: 'result' }],
  }
}

function teamStatusOptionView(status: SubmissionTeamStatus): FilterOptionView {
  return {
    textValue: teamStatusLabel(status),
    icon: status === SubmissionTeamStatus.BANNED ? IconGavel : IconShieldFilled,
    segments: [{ text: teamStatusLabel(status) }],
  }
}

function categoryOptionView(category: CategoryFilterOption): FilterOptionView {
  const config = getCategoryConfig(category.value)

  return {
    textValue: category.label,
    style: getCategoryStyle(config.color),
    icon: config.icon,
    iconTone: 'category',
    segments: [{ text: category.label, tone: 'category' }],
  }
}

function divisionOptionView(division: DivisionFilterOption): FilterOptionView {
  return {
    textValue: division.label,
    segments: [{ text: division.label }],
  }
}
