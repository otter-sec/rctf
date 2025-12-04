import { z } from 'zod'
import { response } from '../internal'
import { NumericString } from '../util'

export const GoodDiscordTokenV2 = response('goodDiscordToken', {
  status: 200,
  message: 'The Discord token was created.',
  data: z.object({
    discordToken: z.string(),
    discordName: z.string(),
    discordId: NumericString,
  }),
})
