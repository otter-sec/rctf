import {
  GetAdminSubmissionLogsRouteV2,
  SubmissionLogKind,
  SubmissionLogResult,
} from '@rctf/types'
import { getSubmissionLogs } from '../../../../services/submission-logs'
import adminGroup from '../group'

const splitQueryList = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean) ?? []

const parseSubmissionLogResults = (
  value: string | undefined
): SubmissionLogResult[] | undefined => {
  const results = splitQueryList(value)
  const validResults = new Set<string>(Object.values(SubmissionLogResult))

  return results.every(result => validResults.has(result))
    ? (results as SubmissionLogResult[])
    : undefined
}

const parseSubmissionLogKinds = (
  value: string | undefined
): SubmissionLogKind[] | undefined => {
  const kinds = splitQueryList(value)
  const validKinds = new Set<string>(Object.values(SubmissionLogKind))

  return kinds.every(kind => validKinds.has(kind))
    ? (kinds as SubmissionLogKind[])
    : undefined
}

adminGroup.route(GetAdminSubmissionLogsRouteV2, async ({ res, ctx, query }) => {
  const kinds = parseSubmissionLogKinds(query.kinds)
  const excludeKinds = parseSubmissionLogKinds(query.excludeKinds)
  const results = parseSubmissionLogResults(query.results)
  const excludeResults = parseSubmissionLogResults(query.excludeResults)

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
  })

  return res.goodAdminSubmissionLogs({
    logs: data.logs,
    total: data.total,
  })
})
