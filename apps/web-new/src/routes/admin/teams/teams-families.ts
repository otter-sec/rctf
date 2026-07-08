import { AdminTeamStatus } from '@rctf/types'
import {
  clearFilter,
  toggleFilterOption,
  type MultiFilter,
} from '$lib/filters/core'
import {
  defineValueFilterFamily,
  type FilterOptionView,
  type ResultTone,
  type ValueFilterFamily,
} from '$lib/filters/ui'
import { IconCircleCheckFilled, IconUsersGroup } from '$lib/icons'
import {
  statusLabel,
  TEAM_STATUS_VALUES,
  type DivisionOption,
  type TeamStatusValue,
} from './teams-model'

function statusResultTone(status: TeamStatusValue): ResultTone | undefined {
  switch (status) {
    case AdminTeamStatus.ACTIVE:
      return 'success'
    case AdminTeamStatus.BANNED:
      return 'danger'
    case 'unverified':
      return 'warning'
    default:
      return undefined
  }
}

function statusOptionView(status: TeamStatusValue): FilterOptionView {
  return {
    textValue: statusLabel(status),
    segments: [{ text: statusLabel(status) }],
    resultTone: statusResultTone(status),
  }
}

export function statusFilterFamily(
  filter: MultiFilter<TeamStatusValue>
): ValueFilterFamily {
  return defineValueFilterFamily<TeamStatusValue>({
    id: 'status',
    label: 'Status',
    pluralLabel: 'statuses',
    icon: IconCircleCheckFilled,
    menuSize: 'narrow',
    searchTerms: ['active', 'banned', 'admin', 'unverified'],
    clear: () => clearFilter(filter),
    emptyLabel: 'No statuses',
    options: () => TEAM_STATUS_VALUES,
    optionKey: status => status,
    optionSearchValues: status => [statusLabel(status), status],
    optionSelected: status => filter.selected.includes(status),
    toggleOption: status => toggleFilterOption(filter, status, value => value),
    optionView: statusOptionView,
  })
}

export function divisionFilterFamily(
  filter: MultiFilter<DivisionOption>,
  options: () => readonly DivisionOption[]
): ValueFilterFamily {
  return defineValueFilterFamily<DivisionOption>({
    id: 'division',
    label: 'Division',
    pluralLabel: 'divisions',
    icon: IconUsersGroup,
    menuSize: 'narrow',
    clear: () => clearFilter(filter),
    emptyLabel: 'No divisions',
    options,
    optionKey: option => option.value,
    optionSearchValues: option => [option.label, option.value],
    optionSelected: option =>
      filter.selected.some(selected => selected.value === option.value),
    toggleOption: option =>
      toggleFilterOption(filter, option, value => value.value),
    optionView: option => ({
      textValue: option.label,
      segments: [{ text: option.label }],
    }),
  })
}
