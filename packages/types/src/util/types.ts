import { z } from 'zod/mini'
import { BadEmail, BadName } from '../responses'
import { normalizeEmail, normalizeName, validateEmail } from '../v1-validators'

export const UserEmail = z
  .pipe(z.string(), z.transform(normalizeEmail))
  .check(
    z.refine(validateEmail, {
      message: 'Enter a valid email',
      params: { response: BadEmail },
    })
  )
  .check(z.describe('Email address. Normalized to lowercase and trimmed.'))

export const UserName = z
  .pipe(z.string(), z.transform(normalizeName))
  .check(
    z.refine((name: string) => /^[ -~]{2,64}$/.test(name), {
      message: 'Name must be 2-64 printable characters',
      params: { response: BadName },
    })
  )
  .check(z.describe('2-64 printable ASCII characters.'))

export const NumericString = z.pipe(
  z.transform((item: unknown) => {
    if (typeof item === 'string') {
      return item
    }
    if (typeof item === 'number') {
      return item.toString()
    }

    return undefined
  }),
  z.string()
)

const UPLOAD_FILE_NAME_PATTERN = /^(?!\.{1,2}$)[^/\\\0:]{1,255}$/
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i

export const UploadFileName = z
  .string()
  .check(
    z.minLength(1),
    z.maxLength(255),
    z.regex(UPLOAD_FILE_NAME_PATTERN, 'Invalid upload file name')
  )

export const UploadSha256 = z
  .string()
  .check(z.regex(SHA256_HEX_PATTERN, 'Expected SHA-256 hex digest'))

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

export const FileFieldSchema = z
  .custom<FileField>(isFileField, {
    message: 'Expected file upload',
  })
  .check(
    z.refine((file: FileField) => UPLOAD_FILE_NAME_PATTERN.test(file.name), {
      message: 'Invalid upload file name',
    })
  )

export const MultipleFileFieldSchema = z.pipe(
  z.transform((val: unknown) => (Array.isArray(val) ? val : [val])),
  z.array(FileFieldSchema)
)
