import { z } from 'zod/mini'
import { response } from '../internal'
import { SubmissionKind, SubmissionResult } from '../util'

export const GoodAdminSubmissions = response('goodAdminSubmissions', {
  status: 200,
  message: 'The submissions were retrieved successfully.',
  data: z.object({
    submissions: z.array(
      z.object({
        id: z.string(),
        kind: z.enum(SubmissionKind),
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
        result: z.enum(SubmissionResult),
        details: z.record(z.string(), z.any()),
        relatedId: z.nullable(z.string()),
        createdAt: z.string(),
      })
    ),
    hasMore: z.boolean(),
  }),
})
