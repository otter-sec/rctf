import { z } from 'zod'

import { response } from '../dsl'

const ChallengeFileSchema = z.object({
  name: z.string(),
  url: z.string(),
})

export const GoodFilesUpload = response('goodFilesUpload', {
  status: 200,
  message: 'The files were successfully uploaded.',
  data: z.array(ChallengeFileSchema),
})
