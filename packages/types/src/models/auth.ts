import { z } from 'zod'
import { model } from '../dsl'

export const RegisterBody = model('RegisterBody', {
  email: z.string().optional(),
  name: z.string(),
  ctftimeToken: z.string().optional(),
})

export const LoginBody = model('LoginBody', {
  teamToken: z.string().optional(),
  ctftimeToken: z.string().optional(),
})

export const RecoverBody = model('RecoverBody', {
  email: z.string(),
})

export const VerifyBody = model('VerifyBody', {
  verifyToken: z.string(),
})
