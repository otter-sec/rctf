import { response } from '../dsl'

export const BadEndpoint = response('badEndpoint', {
  status: 404,
  message: 'The request endpoint could not be found.',
})
