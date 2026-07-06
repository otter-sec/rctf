import {
  MAX_AVATAR_SIZE,
  validateAvatarFile,
} from '$lib/components/avatar-upload-logic'
import { describe, expect, it } from 'bun:test'

function makeFile(size: number, type: string): File {
  return new File([new Uint8Array(size)], 'avatar', { type })
}

describe('validateAvatarFile', () => {
  it('accepts an image under the limit', () => {
    expect(validateAvatarFile(makeFile(1024, 'image/png'))).toEqual({
      ok: true,
    })
  })

  it('accepts a file of exactly the maximum size', () => {
    expect(validateAvatarFile(makeFile(MAX_AVATAR_SIZE, 'image/png'))).toEqual({
      ok: true,
    })
  })

  it('rejects a file over the limit', () => {
    const result = validateAvatarFile(
      makeFile(MAX_AVATAR_SIZE + 1, 'image/png')
    )
    expect(result).toEqual({
      ok: false,
      message: 'File too large. Maximum size is 1MB',
    })
  })

  it('rejects a non-image file within the size limit', () => {
    const result = validateAvatarFile(makeFile(1024, 'text/plain'))
    expect(result).toEqual({
      ok: false,
      message: 'Please select an image file',
    })
  })

  it('reports size before type when both fail', () => {
    const result = validateAvatarFile(
      makeFile(MAX_AVATAR_SIZE + 1, 'text/plain')
    )
    expect(result).toEqual({
      ok: false,
      message: 'File too large. Maximum size is 1MB',
    })
  })
})
