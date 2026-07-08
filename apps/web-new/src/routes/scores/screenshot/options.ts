import { intervalToDuration } from '$lib/utils/time'

export type ScreenshotFormat = 'png' | 'jpeg' | 'webp'

export interface ScreenshotOptions {
  teamCount: number
  graphTeamCount: number
  showSelf: boolean
  showGraph: boolean
  showAvatars: boolean
  showFlags: boolean
  showStatuses: boolean
  showSolveCount: boolean
  showSparklines: boolean
  showMatrix: boolean
  showHeader: boolean
  subtitle: string
  emphasizeListedTeams: boolean
  emphasizeSelfOnly: boolean
}

export interface ExportSettings {
  scale: number
  format: ScreenshotFormat
}

export interface ScreenshotTeam {
  id: string
  rank: number
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solveCount: number
  isCurrentUser: boolean
  sparklineData: { time: number; score: number }[]
  color: string
}

export const TEAM_COUNT_OPTIONS = [3, 5, 10, 20] as const
export const SCALE_OPTIONS = [1, 2, 3] as const
export const FORMAT_OPTIONS: readonly ScreenshotFormat[] = [
  'png',
  'jpeg',
  'webp',
]

export const DEFAULT_OPTIONS: ScreenshotOptions = {
  teamCount: 5,
  graphTeamCount: 10,
  showSelf: true,
  showGraph: true,
  showAvatars: true,
  showFlags: true,
  showStatuses: true,
  showSolveCount: true,
  showSparklines: true,
  showMatrix: true,
  showHeader: true,
  subtitle: '',
  emphasizeListedTeams: true,
  emphasizeSelfOnly: false,
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  scale: 2,
  format: 'png',
}

export interface ToggleState {
  visible: boolean
  disabled: boolean
  reason: string | null
}

/** "Emphasize your team only" is offered while the graph is shown and a self
 * team exists, but is disabled unless the self row is also displayed. */
export function getEmphasizeSelfOnlyState(
  options: ScreenshotOptions,
  hasSelf: boolean
): ToggleState {
  const visible = options.showGraph && hasSelf
  const disabled = !options.showSelf
  return {
    visible,
    disabled,
    reason: disabled ? 'Requires "Show your team"' : null,
  }
}

/** "Emphasize listed teams" is overridden by self-only emphasis and requires
 * more graphed teams than listed to have any teams left to dim. */
export function getEmphasizeListedState(
  options: ScreenshotOptions
): ToggleState {
  const overridden = options.emphasizeSelfOnly
  const notEnoughGraphed = options.graphTeamCount <= options.teamCount
  const disabled = overridden || notEnoughGraphed
  const reason = overridden
    ? 'Overridden by "Emphasize your team only"'
    : notEnoughGraphed
      ? 'Requires more graphed teams than listed'
      : null
  return { visible: options.showGraph, disabled, reason }
}

export function getListedTopIds(
  teamIds: readonly string[],
  teamCount: number
): Set<string> {
  return new Set(teamIds.slice(0, teamCount))
}

export function getDisplayTeamIds(
  teamIds: readonly string[],
  selfId: string | null,
  teamCount: number,
  showSelf: boolean
): string[] {
  const limited = teamIds.slice(0, teamCount)
  if (showSelf && selfId && !limited.includes(selfId)) {
    return [...limited, selfId]
  }
  return limited
}

export function getVisibleGraphIds(
  teamIds: readonly string[],
  graphTeamCount: number
): string[] {
  return teamIds.slice(0, graphTeamCount)
}

/** Teams the graph should dim, driven by the active emphasis mode. Returns
 * `undefined` when nothing should be dimmed. */
export function deriveContextTeamIds(
  options: ScreenshotOptions,
  visibleGraphIds: readonly string[],
  displayTeamIds: readonly string[],
  selfId: string | null
): Set<string> | undefined {
  if (options.emphasizeSelfOnly && selfId) {
    return new Set(visibleGraphIds.filter(id => id !== selfId))
  }
  if (
    !options.emphasizeListedTeams ||
    options.graphTeamCount <= options.teamCount
  ) {
    return undefined
  }
  const listed = new Set(displayTeamIds)
  return new Set(visibleGraphIds.filter(id => !listed.has(id)))
}

export function buildFilename(
  format: ScreenshotFormat,
  date: Date = new Date()
): string {
  return `leaderboard-${date.toISOString().slice(0, 10)}.${format}`
}

export function buildDurationLabel(startTime: number, endTime: number): string {
  const { days, hours } = intervalToDuration(endTime - startTime)
  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  return parts.join(' ')
}

const dateRangeFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function buildDateRangeLabel(
  startTime: number,
  endTime: number
): string {
  return `${dateRangeFormat.format(startTime)} → ${dateRangeFormat.format(endTime)}`
}
