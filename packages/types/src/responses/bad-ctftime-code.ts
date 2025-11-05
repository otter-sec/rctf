import { response } from '../internal'

export const BadCtftimeCode = response('badCtftimeCode', {
  status: 401,
  message: 'The CTFtime code is invalid.',
})
