import { response } from '../internal'

export const BadReplayedRequest = response('badReplayedRequest', {
  status: 409,
  message: 'This signed request was already delivered.',
})
