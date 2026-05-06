import { z } from 'zod/mini'
import { response } from '../internal'
import { SubmissionLogKind, SubmissionLogResult } from '../util'

export const GoodAdminSubmissionLogs = response('goodAdminSubmissionLogs', {
  status: 200,
  message: 'The submission logs were retrieved successfully.',
  data: z.object({
    logs: z.array(
      z.object({
        id: z.string(),
        kind: z.enum(SubmissionLogKind),
        challengeId: z.string(),
        challengeName: z.string(),
        challengeCategory: z.string(),
        userId: z.string(),
        userName: z.string(),
        userDivision: z.string(),
        userAvatarUrl: z.nullable(z.string()),
        userCountryCode: z.nullable(z.string()),
        userStatusText: z.nullable(z.string()),
        userBanned: z.boolean(),
        ip: z.string(),
        result: z.enum(SubmissionLogResult),
        details: z.record(z.string(), z.any()),
        relatedId: z.nullable(z.string()),
        createdAt: z.string(),
      })
    ),
    total: z.int(),
  }),
})
