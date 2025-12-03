import { z } from 'zod'
import { response } from '../internal'

const ChallengeFileSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number().int(),
})

export const GoodFilesUploadV2 = response('goodFilesUpload', {
  status: 200,
  message: 'The files were successfully uploaded.',
  data: z.array(ChallengeFileSchema),
})
