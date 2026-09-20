import { response } from '../internal'

export const BadCredentials = response('badCredentials', {
  status: 401,
  message: 'The name or password is incorrect.',
})
