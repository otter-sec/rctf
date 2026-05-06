import { config } from '@rctf/config'
import {
  GetAdminSubmissionLogsRouteV2,
  SubmissionLogKind,
  SubmissionLogResult,
  SubmissionLogTeamStatus,
} from '@rctf/types'
import { getSubmissionLogs } from '../../../../services/submission-logs'
import adminGroup from '../group'

const splitQueryList = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean) ?? []

const parseEnumList = <T extends string>(
  value: string | undefined,
  validValues: T[]
): T[] | undefined => {
  const items = splitQueryList(value)
  const allowed = new Set<string>(validValues)

  return items.every(item => allowed.has(item)) ? (items as T[]) : undefined
}

const parseList = (
  value: string | undefined,
  isValid: (value: string) => boolean
) => {
  const items = splitQueryList(value)
  return items.every(isValid) ? items : undefined
}

const parseDate = (value: string | undefined) => {
  if (!value) return undefined

  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}

adminGroup.route(GetAdminSubmissionLogsRouteV2, async ({ res, ctx, query }) => {
  const kinds = parseEnumList(query.kinds, Object.values(SubmissionLogKind))
  const excludeKinds = parseEnumList(
    query.excludeKinds,
    Object.values(SubmissionLogKind)
  )
  const results = parseEnumList(
    query.results,
    Object.values(SubmissionLogResult)
  )
  const excludeResults = parseEnumList(
    query.excludeResults,
    Object.values(SubmissionLogResult)
  )
  const teamStatuses = parseEnumList(
    query.teamStatuses,
    Object.values(SubmissionLogTeamStatus)
  )
  const excludeTeamStatuses = parseEnumList(
    query.excludeTeamStatuses,
    Object.values(SubmissionLogTeamStatus)
  )
  const categories = splitQueryList(query.categories)
  const excludeCategories = splitQueryList(query.excludeCategories)
  const divisions = parseList(query.divisions, division =>
    Object.hasOwn(config.divisions, division)
  )
  const excludeDivisions = parseList(query.excludeDivisions, division =>
    Object.hasOwn(config.divisions, division)
  )
  const createdAfter = parseDate(query.createdAfter)
  const createdBefore = parseDate(query.createdBefore)

  if (query.kinds && !kinds) {
    return res.badBody({
      reason: 'query:kinds: invalid submission log kind',
    })
  }
  if (query.excludeKinds && !excludeKinds) {
    return res.badBody({
      reason: 'query:excludeKinds: invalid submission log kind',
    })
  }
  if (query.results && !results) {
    return res.badBody({
      reason: 'query:results: invalid submission log result',
    })
  }
  if (query.excludeResults && !excludeResults) {
    return res.badBody({
      reason: 'query:excludeResults: invalid submission log result',
    })
  }
  if (query.teamStatuses && !teamStatuses) {
    return res.badBody({
      reason: 'query:teamStatuses: invalid team status',
    })
  }
  if (query.excludeTeamStatuses && !excludeTeamStatuses) {
    return res.badBody({
      reason: 'query:excludeTeamStatuses: invalid team status',
    })
  }
  if (query.divisions && !divisions) {
    return res.badBody({
      reason: 'query:divisions: invalid division',
    })
  }
  if (query.excludeDivisions && !excludeDivisions) {
    return res.badBody({
      reason: 'query:excludeDivisions: invalid division',
    })
  }
  if (query.createdAfter && !createdAfter) {
    return res.badBody({
      reason: 'query:createdAfter: invalid date',
    })
  }
  if (query.createdBefore && !createdBefore) {
    return res.badBody({
      reason: 'query:createdBefore: invalid date',
    })
  }
  if (createdAfter && createdBefore && createdAfter > createdBefore) {
    return res.badBody({
      reason: 'query:createdAfter: must be before createdBefore',
    })
  }

  const data = await getSubmissionLogs(ctx.var.db, {
    limit: query.limit,
    offset: query.offset,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    challengeIds: [
      ...splitQueryList(query.challengeId),
      ...splitQueryList(query.challengeIds),
    ],
    excludeChallengeIds: splitQueryList(query.excludeChallengeIds),
    challengeSearch: query.challengeSearch,
    userIds: [
      ...splitQueryList(query.userId),
      ...splitQueryList(query.userIds),
    ],
    excludeUserIds: splitQueryList(query.excludeUserIds),
    teamSearch: query.teamSearch,
    kinds: [...(query.kind ? [query.kind] : []), ...(kinds ?? [])],
    excludeKinds,
    results: [...(query.result ? [query.result] : []), ...(results ?? [])],
    excludeResults,
    teamStatuses: [
      ...(query.teamStatus ? [query.teamStatus] : []),
      ...(teamStatuses ?? []),
    ],
    excludeTeamStatuses,
    categories,
    excludeCategories,
    divisions,
    excludeDivisions,
    createdAfter,
    createdBefore,
  })

  return res.goodAdminSubmissionLogs({
    logs: data.logs,
    total: data.total,
  })
})
