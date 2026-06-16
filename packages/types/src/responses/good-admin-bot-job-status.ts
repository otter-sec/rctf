import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminBotJobStatus } from '../util'
import { example } from '../util/example'

export const GoodAdminBotJobStatus = response('goodAdminBotJobStatus', {
  status: 200,
  message: 'The admin bot job status was retrieved successfully.',
  data: z.object({
    job: z.nullable(
      z.object({
        id: example(z.string(), 'job-1a2b3c').check(
          z.describe('Admin-bot job ID.')
        ),
        status: example(z.enum(AdminBotJobStatus), 'running').check(
          z.describe('Current job status.')
        ),
        createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
          z.describe('Job creation time as an ISO 8601 string.')
        ),
        queuePosition: example(z.nullable(z.int()), 3).check(
          z.describe('Position in the queue, or `null` when not queued.')
        ),
        logs: example(z.nullable(z.string()), 'Visiting target...').check(
          z.describe('Captured job logs, or `null` when none.')
        ),
      })
    ),
  }),
})
