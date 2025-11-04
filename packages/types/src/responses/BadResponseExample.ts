import { response } from '../dsl'

export const BadResponse = response('BadResponse', {
  status: 400,
  message: 'Bad response retrieved',
})
