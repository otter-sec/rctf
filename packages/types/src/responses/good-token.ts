import { response } from '../internal'

export const GoodToken = response('goodToken', {
  status: 200,
  message: 'The authorization token is valid.',
})
