import { response } from '../dsl'

export const BadAlreadySolvedChallenge = response('badAlreadySolvedChallenge', {
  status: 409,
  message: 'The flag was already submitted.',
})
