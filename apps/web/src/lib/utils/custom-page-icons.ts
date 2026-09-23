import type { ClientConfig } from '@rctf/types'
import {
  IconClock,
  IconFile,
  IconFlagBannerFold,
  IconGavel,
  IconGlobeHemisphereWest,
  IconInfo,
  IconKey,
  IconPuzzlePiece,
  IconQuestion,
  IconTrophy,
  IconUsersThree,
  IconWarning,
} from '$lib/icons'

type CustomPageIcon = ClientConfig['customPages'][number]['icon']

const customPageIcons = {
  file: IconFile,
  info: IconInfo,
  question: IconQuestion,
  warning: IconWarning,
  gavel: IconGavel,
  globe: IconGlobeHemisphereWest,
  flag: IconFlagBannerFold,
  trophy: IconTrophy,
  users: IconUsersThree,
  clock: IconClock,
  key: IconKey,
  puzzle: IconPuzzlePiece,
} satisfies Record<CustomPageIcon, typeof IconFile>

export const getCustomPageIcon = (icon: CustomPageIcon) => customPageIcons[icon]
