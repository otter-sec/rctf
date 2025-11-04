import { response } from '../dsl'

export const BadUnknownUser = response('badUnknownUser', {
  status: 404,
  message: 'The user does not exist.',
})
