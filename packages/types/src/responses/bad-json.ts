import { response } from '../dsl'

export const BadJson = response('badJson', {
  status: 400,
  message: 'The request JSON body is malformed.',
})
