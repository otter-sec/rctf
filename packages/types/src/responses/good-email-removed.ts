import { response } from '../internal'

export const GoodEmailRemoved = response('goodEmailRemoved', {
  status: 200,
  message: 'The email address was removed from the user.',
})
