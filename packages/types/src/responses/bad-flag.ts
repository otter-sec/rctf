import { response } from '../dsl'

export const BadFlag = response('badFlag', {
  status: 400,
  message: 'The flag was incorrect.',
})
