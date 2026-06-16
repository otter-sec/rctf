import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotChallengeSource = response(
  'goodAdminBotChallengeSource',
  {
    status: 200,
    message: 'The admin bot challenge source was retrieved successfully.',
    data: z.object({
      sourceCode: example(z.string(), 'await page.goto(url)').check(
        z.describe('Admin-bot script source code.')
      ),
      configRevision: example(z.string(), 'v1').check(
        z.describe('Config revision the source belongs to.')
      ),
    }),
  }
)
