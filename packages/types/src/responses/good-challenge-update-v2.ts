import { response } from '../internal'
import { AdminChallengeSchemaV2 } from './good-admin-challenge-v2'

export const GoodChallengeUpdateV2 = response('goodChallengeUpdate', {
  status: 200,
  message: 'Challenge successfully updated.',
  data: AdminChallengeSchemaV2,
})
