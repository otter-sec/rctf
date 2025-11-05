import { response } from '../internal'

export const BadKnownName = response('badKnownName', {
  status: 409,
  message: 'An account with this name already exists.',
})
