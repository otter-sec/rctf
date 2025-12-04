import { response } from '../internal'

export const BadDiscordCodeV2 = response('badDiscordCode', {
  status: 401,
  message: 'The Discord code is invalid.',
})
