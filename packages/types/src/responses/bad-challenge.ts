import { response } from '../internal'

export const BadChallenge = response('badChallenge', {
  status: 404,
  message: 'The challenge could not be not found.',
})
