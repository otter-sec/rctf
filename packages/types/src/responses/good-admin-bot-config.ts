import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotConfig = response('goodAdminBotConfig', {
  status: 200,
  message: 'The admin bot config was retrieved successfully.',
  data: z.object({
    sourceCode: example(z.string(), 'await page.goto(url)').check(
      z.describe('Admin-bot script source code.')
    ),
    fileExtension: example(z.string(), 'js').check(
      z.describe('File extension for the script language.')
    ),
  }),
})
