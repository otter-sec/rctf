import { response } from '../dsl'

export const BadEnded = response('badEnded', {
  status: 401,
  message: 'The CTF has ended.',
})
