import { config } from '@rctf/config'
import {
  AdminTeamStatus,
  BadBody,
  GetAdminUsersRouteV2,
  type ResponseHelpers,
} from '@rctf/types'
import { getAllUsersWithScores } from '../../../../services/users'
import adminGroup from '../group'

type AdminUsersResponseHelpers = ResponseHelpers<[typeof BadBody]>

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

const parseDivisionList = (value: string | undefined) => {
  const items = splitQueryList(value)
  return items.every(division => Object.hasOwn(config.divisions, division))
    ? items
    : undefined
}

const badQueryList = (
  res: AdminUsersResponseHelpers,
  key: string,
  label: string
) =>
  res.badBody({
    reason: `query:${key}: invalid ${label}`,
  })

adminGroup.route(GetAdminUsersRouteV2, async ({ ctx, res, query }) => {
  const statuses = parseEnumList(query.statuses, Object.values(AdminTeamStatus))
  const excludeStatuses = parseEnumList(
    query.excludeStatuses,
    Object.values(AdminTeamStatus)
  )
  const divisions = parseDivisionList(query.divisions)
  const excludeDivisions = parseDivisionList(query.excludeDivisions)

  if (query.statuses && !statuses) {
    return badQueryList(res, 'statuses', 'team status')
  }
  if (query.excludeStatuses && !excludeStatuses) {
    return badQueryList(res, 'excludeStatuses', 'team status')
  }
  if (query.divisions && !divisions) {
    return badQueryList(res, 'divisions', 'division')
  }
  if (query.excludeDivisions && !excludeDivisions) {
    return badQueryList(res, 'excludeDivisions', 'division')
  }

  return res.goodAdminUsers(
    await getAllUsersWithScores(ctx.var.db, {
      limit: query.limit,
      offset: query.offset,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      statuses,
      excludeStatuses,
      divisions,
      excludeDivisions,
    })
  )
})
