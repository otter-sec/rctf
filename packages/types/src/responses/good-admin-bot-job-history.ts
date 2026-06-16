import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminBotJobStatus } from '../util'
import { example } from '../util/example'

export const GoodAdminBotJobHistory = response('goodAdminBotJobHistory', {
  status: 200,
  message: 'The admin bot job history was retrieved successfully.',
  data: z.object({
    jobs: z.array(
      z.object({
        id: example(z.string(), 'job-1a2b3c').check(
          z.describe('Admin-bot job ID.')
        ),
        status: example(z.enum(AdminBotJobStatus), 'completed').check(
          z.describe('Current job status.')
        ),
        createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
          z.describe('Job creation time as an ISO 8601 string.')
        ),
        hasLogs: example(z.boolean(), true).check(
          z.describe('Whether logs are available for the job.')
        ),
      })
    ),
  }),
})
