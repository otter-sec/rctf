import { response } from '../internal'

export const BadPassword = response('badPassword', {
  status: 400,
  message: 'The password does not meet the requirements.',
})
