import { response } from '../dsl'

export const BadNotStarted = response('badNotStarted', {
  status: 401,
  message: 'The CTF has not started yet.',
})
