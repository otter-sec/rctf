import { response } from '../internal'

export const BadUnknownVerification = response('badUnknownVerification', {
  status: 404,
  message: 'The verification request does not exist.',
})
