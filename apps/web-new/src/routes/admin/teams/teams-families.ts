/**
 * The teams table's two filter families, expressed against the shared
 * `ValueFilterFamily` descriptor so the committed filter menu, chips, and mobile
 * drawer render them generically. Status is a static dot+label family; Division
 * is driven by the deployment's configured divisions.
 */
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
import IconCircleCheck from '$lib/icons/icon-circle-check-filled.svelte'
import IconUsersGroup from '$lib/icons/icon-users-group.svelte'
import {
  statusLabel,
  TEAM_STATUS_VALUES,
  type DivisionOption,
  type TeamStatusValue,
} from './teams-model'

// The generic option renderer only carries success/warning/danger dots, so the
// accent-toned Admin status falls back to a neutral dot in the filter menu; the
// table's own Status cell paints the full four-tone (incl. accent) dot+label.
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
    icon: IconCircleCheck,
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
