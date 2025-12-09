import { response } from '../internal'

export const BadCaptcha = response('badCaptcha', {
  status: 403,
  message: 'The captcha verification failed.',
})
