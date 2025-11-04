import { response } from '../dsl'

export const GoodFlag = response('goodFlag', {
  status: 200,
  message: 'The flag is correct.',
})
