import { z } from 'zod'
import { BadEmail, BadName } from '../responses'
import {
  normalizeEmail,
  normalizeName,
  validateEmail,
  validateName,
} from '../v1-validators'

export const UserEmail = z
  .string()
  .transform(normalizeEmail)
  .refine(validateEmail, {
    params: { response: BadEmail },
  })

export const UserName = z
  .string()
  .transform(normalizeName)
  .refine(validateName, {
    params: { response: BadName },
  })
