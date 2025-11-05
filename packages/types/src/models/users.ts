import { z } from 'zod'
import { model } from '../internal'

export const UpdateUserBody = model('UpdateUserBody', {
  name: z.string().optional(),
  division: z.string().optional(),
})

export const CreateMemberBody = model('CreateMemberBody', {
  email: z.string(),
})

export const SetEmailBody = model('SetEmailBody', {
  email: z.string(),
})

export const SetCtftimeBody = model('SetCtftimeBody', {
  ctftimeToken: z.string(),
})
