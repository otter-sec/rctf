import { response } from '../internal'

export const GoodFlag = response('goodFlag', {
  status: 200,
  message: 'The flag is correct.',
})
