import { response } from '../internal'

export const BadNotStarted = response('badNotStarted', {
  status: 401,
  message: 'The CTF has not started yet.',
})
