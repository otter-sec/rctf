import { response } from '../internal'

export const BadPerms = response('badPerms', {
  status: 403,
  message: 'The user does not have the required permissions.',
})
