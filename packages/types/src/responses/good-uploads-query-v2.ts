import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodUploadsQueryV2 = response('goodUploadsQueryV2', {
  status: 200,
  message: 'The status of uploads was successfully queried.',
  data: z.array(
    z.object({
      sha256: example(
        z.string(),
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      ).check(z.describe('SHA-256 hash of the file contents.')),
      name: example(z.string(), 'chall.zip').check(z.describe('File name.')),
      url: example(
        z.nullable(z.string()),
        'https://rctf.osec.io/uploads/chall.zip'
      ).check(z.describe('Download URL, or `null` when not uploaded.')),
      size: example(z.nullable(z.number()), 2048).check(
        z.describe('File size in bytes, or `null` when unknown.')
      ),
    })
  ),
})
