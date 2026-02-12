import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotChallengeSource = response(
  'goodAdminBotChallengeSource',
  {
    status: 200,
    message: 'The admin bot challenge source was retrieved successfully.',
    data: z.object({
      sourceCode: z.string(),
      configRevision: z.string(),
    }),
  }
)
