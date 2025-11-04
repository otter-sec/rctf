import { response } from '../dsl'

export const BadUnknownEmail = response('badUnknownEmail', {
  status: 404,
  message: 'The account does not exist.',
})
