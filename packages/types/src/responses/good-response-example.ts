import { response } from '../dsl'
import { OutUser } from '../models/out-user-example'

export const GoodResponse = response('GoodResponse', {
  status: 200,
  message: 'Good response retrieved',
  data: OutUser.schema,
})
