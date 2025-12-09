import { z } from 'zod/mini'
import { response } from '../internal'
import { ChallengeFileSchemaV1 } from '../util'

export const GoodFilesUpload = response('goodFilesUpload', {
  status: 200,
  message: 'The files were successfully uploaded.',
  data: z.array(ChallengeFileSchemaV1),
})
