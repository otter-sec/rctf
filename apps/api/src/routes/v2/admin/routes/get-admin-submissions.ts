import {
  FilterAdminSubmissionsRouteV2,
  GetAdminSubmissionsRouteV2,
} from '@rctf/types'
import { getSubmissions } from '../../../../services/submissions'
import adminGroup from '../group'

adminGroup.route(GetAdminSubmissionsRouteV2, async ({ res, ctx, query }) => {
  return res.goodAdminSubmissions(await getSubmissions(ctx.var.db, query))
})

adminGroup.route(
  FilterAdminSubmissionsRouteV2,
  async ({ res, ctx, query, body }) => {
    return res.goodAdminSubmissions(
      await getSubmissions(ctx.var.db, { ...query, ...body })
    )
  }
)
