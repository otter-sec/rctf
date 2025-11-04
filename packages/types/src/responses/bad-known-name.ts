import { response } from '../dsl'

export const BadKnownName = response('badKnownName', {
  status: 409,
  message: 'An account with this name already exists.',
})
