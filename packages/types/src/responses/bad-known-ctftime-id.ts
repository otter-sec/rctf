import { response } from '../dsl'

export const BadKnownCtftimeId = response('badKnownCtftimeId', {
  status: 409,
  message: 'An account with this CTFtime ID already exists.',
})
