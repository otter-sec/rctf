import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotJobPull = response('goodAdminBotJobPull', {
  status: 200,
  message: 'The admin bot job was pulled successfully.',
  data: z.object({
    job: z.nullable(
      z.object({
        id: example(z.string(), 'job-1a2b3c').check(
          z.describe('Admin-bot job ID.')
        ),
        challengeId: example(z.string(), 'baby-rev').check(
          z.describe('Challenge ID the job targets.')
        ),
        configRevision: example(z.string(), 'v1').check(
          z.describe('Admin-bot config revision used.')
        ),
        userId: example(z.string(), 'team-1a2b3c').check(
          z.describe('Team ID that submitted the job.')
        ),
        submittedAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
          z.describe('Submission time as an ISO 8601 string.')
        ),
        flag: example(z.string(), 'rctf{baby_rev}').check(
          z.describe('Flag the bot should submit, when applicable.')
        ),
        inputs: example(z.record(z.string(), z.string()), {
          url: 'https://example.com',
        }).check(z.describe('Submitted input values keyed by field name.')),
        instancerInstances: z.array(
          z.object({
            type: example(z.string(), 'tcp').check(
              z.describe('Instance exposure type.')
            ),
            host: example(z.string(), 'baby-rev.rctf.osec.io').check(
              z.describe('Instance host.')
            ),
            port: example(z.number(), 1337).check(z.describe('Instance port.')),
            title: example(z.optional(z.string()), 'nc').check(
              z.describe('Short label for the instance, when present.')
            ),
          })
        ),
      })
    ),
  }),
})
