import { response } from '../internal'

export const BadKnownEmail = response('badKnownEmail', {
  status: 409,
  message: 'An account with this email already exists.',
})
