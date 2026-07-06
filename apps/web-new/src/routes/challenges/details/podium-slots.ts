import { getTimeOrdinal } from '@rctf/util'
import type { RankVariant } from '../model/solve-times'

const MEDAL_VARIANTS: RankVariant[] = ['gold', 'silver', 'bronze', 'nth']

export interface PodiumEntry {
  userId: string
  name: string
  avatarUrl: string | null
  detail: string
  isSelf: boolean
}

export interface PodiumSelf {
  name: string
  avatarUrl: string | null
  position: number
  detail: string
}

export interface PodiumPlaceholder {
  name: string
  avatarUrl: string | null
  detail: string
}

export type PodiumSlotKind = 'entry' | 'self' | 'placeholder' | 'empty'

export interface PodiumSlot {
  kind: PodiumSlotKind
  variant: RankVariant
  ordinal: string
  name: string
  avatarUrl: string | null
  detail: string
  isSelf: boolean
}

export interface ResolvePodiumInput {
  top: PodiumEntry[]
  selfEntry: PodiumSelf | null
  placeholder: PodiumPlaceholder | null
  isAuthenticated: boolean
}

function entrySlot(index: number, entry: PodiumEntry): PodiumSlot {
  return {
    kind: 'entry',
    variant: entry.isSelf ? 'self' : (MEDAL_VARIANTS[index] ?? 'nth'),
    ordinal: getTimeOrdinal(index + 1),
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    detail: entry.detail,
    isSelf: entry.isSelf,
  }
}

function emptySlot(index: number): PodiumSlot {
  return {
    kind: 'empty',
    variant: MEDAL_VARIANTS[index] ?? 'nth',
    ordinal: '',
    name: '',
    avatarUrl: null,
    detail: '',
    isSelf: false,
  }
}

function selfSlot(self: PodiumSelf): PodiumSlot {
  return {
    kind: 'self',
    variant: 'self',
    ordinal: getTimeOrdinal(self.position),
    name: self.name,
    avatarUrl: self.avatarUrl,
    detail: self.detail,
    isSelf: true,
  }
}

function placeholderSlot(fallback: PodiumPlaceholder): PodiumSlot {
  return {
    kind: 'placeholder',
    variant: 'nth',
    ordinal: 'You',
    name: fallback.name,
    avatarUrl: fallback.avatarUrl,
    detail: fallback.detail,
    isSelf: true,
  }
}

export function resolvePodiumSlots(input: ResolvePodiumInput): PodiumSlot[] {
  const { top, selfEntry, placeholder, isAuthenticated } = input

  const slots: PodiumSlot[] = []
  for (let index = 0; index < 3; index++) {
    const entry = top[index]
    slots.push(entry ? entrySlot(index, entry) : emptySlot(index))
  }

  const userInTopThree = top.slice(0, 3).some(entry => entry.isSelf)
  const fourthEntry = top[3]

  if (userInTopThree || !isAuthenticated) {
    slots.push(fourthEntry ? entrySlot(3, fourthEntry) : emptySlot(3))
  } else if (selfEntry) {
    slots.push(selfSlot(selfEntry))
  } else if (placeholder) {
    slots.push(placeholderSlot(placeholder))
  } else {
    slots.push(emptySlot(3))
  }

  return slots
}

export function podiumMinColumns(slots: PodiumSlot[]): number[] {
  const selfIndex = slots.findIndex(slot => slot.isSelf)
  const hideOrder = slots
    .map((_, index) => index)
    .filter(index => index !== selfIndex)
    .reverse()
  return slots.map((_, index) => {
    if (index === selfIndex) return 1
    return 4 - hideOrder.indexOf(index)
  })
}
