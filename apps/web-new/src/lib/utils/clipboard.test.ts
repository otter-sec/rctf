import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'

const success = mock(() => {})
const error = mock(() => {})

mock.module('$lib/toast', () => ({ toast: { success, error } }))

let copyText!: typeof import('./clipboard').copyText

beforeAll(async () => {
  ;({ copyText } = await import('./clipboard'))
})

beforeEach(() => {
  success.mockClear()
  error.mockClear()
})

describe('copyText', () => {
  test('writes to the clipboard and toasts the success message', async () => {
    const writeText = mock(() => Promise.resolve())
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })

    await copyText('secret-token', 'Token copied!')

    expect(writeText).toHaveBeenCalledWith('secret-token')
    expect(success).toHaveBeenCalledWith('Token copied!')
    expect(error).not.toHaveBeenCalled()
  })

  test('toasts an error when the clipboard write rejects', async () => {
    const writeText = mock(() => Promise.reject(new Error('denied')))
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })

    await copyText('secret-token', 'Token copied!')

    expect(error).toHaveBeenCalledWith('Failed to copy to clipboard')
    expect(success).not.toHaveBeenCalled()
  })
})
