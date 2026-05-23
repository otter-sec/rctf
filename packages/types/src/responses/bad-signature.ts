import { response } from '../internal'

export const BadSignature = response('badSignature', {
  status: 401,
  message: 'Invalid HMAC signature or timestamp.',
})
