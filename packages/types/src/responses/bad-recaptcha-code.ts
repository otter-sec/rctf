import { response } from '../internal'

export const BadRecaptchaCode = response('badRecaptchaCode', {
  status: 401,
  message: 'The recaptcha code is invalid.',
})
