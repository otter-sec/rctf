import { z } from 'zod/mini'
import { BadEmail, BadName } from '../responses'
import { normalizeEmail, normalizeName, validateEmail } from '../v1-validators'
import { example } from './example'

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const HttpUrl = z.string().check(
  z.refine(isHttpUrl, {
    message: 'Enter an absolute HTTP or HTTPS URL',
  })
)

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

// oxlint-disable-next-line no-control-regex -- upload names must explicitly reject NUL bytes
const UPLOAD_FILE_NAME_PATTERN = /^(?!\.{1,2}$)[^/\\\u0000:]{1,255}$/
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i

export const UploadFileName = example(z.string(), 'chall.zip')
  .check(
    z.minLength(1),
    z.maxLength(255),
    z.regex(UPLOAD_FILE_NAME_PATTERN, 'Invalid upload file name')
  )
  .check(z.describe('Upload file name (1-255 chars, no path separators).'))

export const UploadSha256 = example(
  z.string(),
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
)
  .check(z.regex(SHA256_HEX_PATTERN, 'Expected SHA-256 hex digest'))
  .check(z.describe('SHA-256 hex digest of the file contents.'))

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

export const MultipleFileFieldSchema = z
  .pipe(
    z.transform((val: unknown) => (Array.isArray(val) ? val : [val])),
    z.array(FileFieldSchema)
  )
  .check(z.describe('One or more files to upload (multipart form-data).'))
