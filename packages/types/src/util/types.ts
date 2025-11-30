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

export const NumericString = z.preprocess(item => {
  if (typeof item === 'string') {
    return item
  }
  if (typeof item === 'number') {
    return item.toString()
  }
  return undefined
}, z.string())

export interface FileField extends Blob {
  readonly name: string
  readonly lastModified?: number
}

export const isFileField = (value: unknown): value is FileField => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<FileField>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.type === 'string' &&
    typeof candidate.arrayBuffer === 'function' &&
    typeof candidate.stream === 'function' &&
    typeof candidate.text === 'function'
  )
}

export const FileFieldSchema = z.custom<FileField>(isFileField, {
  message: 'Expected file upload',
})
