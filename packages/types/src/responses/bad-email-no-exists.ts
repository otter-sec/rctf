import { response } from '../dsl'

export const BadEmailNoExists = response('badEmailNoExists', {
  status: 404,
  message: 'There is no email address associated with the user.',
})
