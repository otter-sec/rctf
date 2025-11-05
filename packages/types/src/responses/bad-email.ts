import { response } from '../internal'

export const BadEmail = response('badEmail', {
  status: 400,
  message: 'The email address is malformed.',
})
