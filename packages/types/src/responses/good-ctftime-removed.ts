import { response } from '../dsl'

export const GoodCtftimeRemoved = response('goodCtftimeRemoved', {
  status: 200,
  message: 'The CTFtime team was removed from the user.',
})
