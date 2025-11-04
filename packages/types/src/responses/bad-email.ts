import { response } from '../dsl'

export const BadEmail = response('badEmail', {
  status: 400,
  message: 'The email address is malformed.',
})
