import { response } from '../internal'

export const BadDiscordTokenV2 = response('badDiscordToken', {
  status: 401,
  message: 'The Discord token provided is invalid.',
})
