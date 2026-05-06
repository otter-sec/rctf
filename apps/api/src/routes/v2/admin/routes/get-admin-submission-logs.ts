import { GetAdminSubmissionLogsRouteV2, SubmissionLogResult } from '@rctf/types'
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

adminGroup.route(GetAdminSubmissionLogsRouteV2, async ({ res, ctx, query }) => {
  const results = parseSubmissionLogResults(query.results)
  if (query.results && !results) {
    return res.badBody({
      reason: 'query:results: invalid submission log result',
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
    challengeSearch: query.challengeSearch,
    userIds: [
      ...splitQueryList(query.userId),
      ...splitQueryList(query.userIds),
    ],
    teamSearch: query.teamSearch,
    kind: query.kind,
    results: [...(query.result ? [query.result] : []), ...(results ?? [])],
  })

  return res.goodAdminSubmissionLogs({
    logs: data.logs,
    total: data.total,
  })
})
