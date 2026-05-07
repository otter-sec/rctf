import { config } from '@rctf/config'
import type { AdminTeamStatus, ResponseHelpers } from '@rctf/types'
import {
  AdminTeamStatus as AdminTeamStatusValue,
  BadBody,
  GetAdminUsersRouteV2,
} from '@rctf/types'
import { getAllUsersWithScores } from '../../../../services/users'
import adminGroup from '../group'

type AdminUsersResponseHelpers = ResponseHelpers<[typeof BadBody]>

const adminTeamStatuses = Object.values(
  AdminTeamStatusValue
) as AdminTeamStatus[]

const splitQueryList = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean) ?? []

const parseEnumList = <TValue extends string>(
  value: string | undefined,
  validValues: readonly TValue[]
): TValue[] | undefined => {
  const items = splitQueryList(value)
  const values = new Set<string>(validValues)

  if (!items.every(item => values.has(item))) {
    return undefined
  }

  return items as TValue[]
}

const parseDivisionList = (value: string | undefined): string[] | undefined => {
  const items = splitQueryList(value)
  if (!items.every(division => Object.hasOwn(config.divisions, division))) {
    return undefined
  }

  return items
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
  const statuses = parseEnumList(query.statuses, adminTeamStatuses)
  if (query.statuses !== undefined && !statuses) {
    return badQueryList(res, 'statuses', 'status')
  }

  const excludeStatuses = parseEnumList(
    query.excludeStatuses,
    adminTeamStatuses
  )
  if (query.excludeStatuses !== undefined && !excludeStatuses) {
    return badQueryList(res, 'excludeStatuses', 'status')
  }

  const divisions = parseDivisionList(query.divisions)
  if (query.divisions !== undefined && !divisions) {
    return badQueryList(res, 'divisions', 'division')
  }

  const excludeDivisions = parseDivisionList(query.excludeDivisions)
  if (query.excludeDivisions !== undefined && !excludeDivisions) {
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
