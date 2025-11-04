import { response } from '../dsl'

export const BadCtftimeToken = response('badCtftimeToken', {
  status: 401,
  message: 'The CTFtime token provided is invalid.',
})
