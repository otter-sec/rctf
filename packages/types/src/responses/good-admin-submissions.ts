import { z } from 'zod/mini'
import { response } from '../internal'
import { SubmissionKind, SubmissionResult } from '../util'
import { example } from '../util/example'

export const GoodAdminSubmissions = response('goodAdminSubmissions', {
  status: 200,
  message: 'The submissions were retrieved successfully.',
  data: z.object({
    total: example(z.int(), 128).check(
      z.describe('Total number of submissions matching the query.')
    ),
    submissions: z.array(
      z.object({
        id: example(z.string(), 'sub-1a2b3c').check(
          z.describe('Submission ID.')
        ),
        kind: example(z.enum(SubmissionKind), 'flag').check(
          z.describe('Kind of submission.')
        ),
        challengeId: example(z.string(), 'baby-rev').check(
          z.describe('Challenge ID.')
        ),
        challengeName: example(z.string(), 'baby-rev').check(
          z.describe('Challenge name.')
        ),
        challengeCategory: example(z.string(), 'rev').check(
          z.describe('Challenge category.')
        ),
        userId: example(z.string(), 'team-1a2b3c').check(
          z.describe('Submitting team ID.')
        ),
        userName: example(z.string(), 'otter-sec').check(
          z.describe('Submitting team name.')
        ),
        userDivision: example(z.string(), 'open').check(
          z.describe('Submitting team division.')
        ),
        userAvatarUrl: example(
          z.nullable(z.string()),
          'https://rctf.osec.io/uploads/avatar.png'
        ).check(z.describe('Team avatar URL, or `null` when unset.')),
        userCountryCode: example(z.nullable(z.string()), 'US').check(
          z.describe('ISO 3166-1 alpha-2 country code, or `null`.')
        ),
        userStatusText: example(z.nullable(z.string()), 'Qualified').check(
          z.describe('Free-form status badge, or `null`.')
        ),
        userBanned: example(z.boolean(), false).check(
          z.describe('Whether the team is banned.')
        ),
        ip: example(z.string(), '203.0.113.7').check(
          z.describe('Source IP of the submission.')
        ),
        result: example(z.enum(SubmissionResult), 'correct').check(
          z.describe('Outcome of the submission.')
        ),
        details: example(z.record(z.string(), z.any()), {}).check(
          z.describe('Result-specific details.')
        ),
        relatedId: example(z.nullable(z.string()), null).check(
          z.describe('Related entity ID (e.g. admin-bot job), or `null`.')
        ),
        createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
          z.describe('Submission time as an ISO 8601 string.')
        ),
      })
    ),
  }),
})
