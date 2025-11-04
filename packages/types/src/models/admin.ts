import { z } from 'zod'
import { model } from '../dsl'

export const UpdateChallengeBody = model('UpdateChallengeBody', {
  data: z
    .object({
      author: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      flag: z.string().optional(),
      name: z.string().optional(),
      points: z
        .object({
          max: z.number().int(),
          min: z.number().int(),
        })
        .optional(),
      tiebreakEligible: z.boolean().optional(),
      files: z
        .array(
          z.object({
            name: z.string(),
            url: z.string(),
          })
        )
        .optional(),
      sortWeight: z.number().optional(),
    })
    .passthrough(),
})

export const UploadFilesBody = model('UploadFilesBody', {
  files: z.array(
    z.object({
      name: z.string(),
      data: z.string(),
    })
  ),
})

export const QueryUploadsBody = model('QueryUploadsBody', {
  uploads: z.array(
    z.object({
      sha256: z.string(),
      name: z.string(),
    })
  ),
})
