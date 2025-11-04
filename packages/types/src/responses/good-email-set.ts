import { response } from '../dsl'

export const GoodEmailSet = response('goodEmailSet', {
  status: 200,
  message: 'The email was successfully updated.',
})
