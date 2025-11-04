import { response } from '../dsl'

export const BadCtftimeCode = response('badCtftimeCode', {
  status: 401,
  message: 'The CTFtime code is invalid.',
})
