import { response } from '../dsl'

export const BadDataUri = response('badDataUri', {
  status: 400,
  message: 'A data URI provided was malformed.',
})
