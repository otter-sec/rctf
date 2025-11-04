import { response } from '../dsl'

export const BadKnownEmail = response('badKnownEmail', {
  status: 409,
  message: 'An account with this email already exists.',
})
