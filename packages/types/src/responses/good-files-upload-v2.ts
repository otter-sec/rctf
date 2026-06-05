import { z } from 'zod/mini'
import { response } from '../internal'
import { ChallengeFileSchemaV2 } from '../util'

export const GoodFilesUploadV2 = response('goodFilesUploadV2', {
  status: 200,
  message: 'The files were successfully uploaded.',
  data: z.array(ChallengeFileSchemaV2),
})
