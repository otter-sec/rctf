import { response } from '../internal'

export const BadAvatarFile = response('badAvatarFile', {
  status: 400,
  message: 'The avatar file is not a valid image.',
})
