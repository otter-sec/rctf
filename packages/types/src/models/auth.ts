import { z } from 'zod'
import { createModel, model } from '../internal'

const RegisterSchema = z
  .object({
    email: z.string().optional(),
    name: z.string(),
    ctftimeToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.ctftimeToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either email or ctftimeToken must be provided.',
        path: ['email'],
      })
    }
  })

export const RegisterBody = createModel('RegisterBody', RegisterSchema)

const LoginSchema = z
  .object({
    teamToken: z.string().optional(),
    ctftimeToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.teamToken && !data.ctftimeToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either teamToken or ctftimeToken must be provided.',
        path: ['teamToken'],
      })
    }
  })

export const LoginBody = createModel('LoginBody', LoginSchema)

export const RecoverBody = model('RecoverBody', {
  email: z.string(),
})

export const VerifyBody = model('VerifyBody', {
  verifyToken: z.string(),
})
