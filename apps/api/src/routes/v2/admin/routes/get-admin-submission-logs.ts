import {
  GetAdminSubmissionLogsRouteV2,
  type SubmissionLogKind,
  type SubmissionLogResult,
} from '@rctf/types'
import { getSubmissionLogs } from '../../../../services/submission-logs'
import adminGroup from '../group'

adminGroup.route(GetAdminSubmissionLogsRouteV2, async ({ res, ctx, query }) => {
  const data = await getSubmissionLogs(ctx.var.db, {
    limit: query.limit,
    offset: query.offset,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    challengeId: query.challengeId,
    challengeIds: query.challengeIds,
    challengeSearch: query.challengeSearch,
    userId: query.userId,
    userIds: query.userIds,
    teamSearch: query.teamSearch,
    kind: query.kind,
    result: query.result,
    results: query.results,
  })

  return res.goodAdminSubmissionLogs({
    logs: data.logs.map(log => ({
      ...log,
      kind: log.kind as SubmissionLogKind,
      result: log.result as SubmissionLogResult,
    })),
    total: data.total,
  })
})
