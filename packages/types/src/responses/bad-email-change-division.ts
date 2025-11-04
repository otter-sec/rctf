import { response } from '../dsl'

export const BadEmailChangeDivision = response('badEmailChangeDivision', {
  status: 403,
  message: 'You are not allowed to stay in your division with this email.',
})
