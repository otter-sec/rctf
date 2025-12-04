import { response } from '../internal'

export const BadUserPrivileged = response('badUserPrivileged', {
  status: 403,
  message: 'The user is privileged and cannot be modified.',
})
