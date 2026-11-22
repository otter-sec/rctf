import { expect, test } from 'bun:test'
import { isCancel } from '@clack/core'
import { PassThrough } from 'node:stream'
import { historyText } from '../src/history-prompt'

test('Ctrl+D cancels and restores the cursor', async () => {
  const input = new PassThrough() as PassThrough & {
    isTTY: boolean
    setRawMode: (enabled: boolean) => void
  }
  input.isTTY = true
  input.setRawMode = () => undefined

  const output = new PassThrough()
  let rendered = ''
  output.on('data', chunk => {
    rendered += chunk.toString()
  })

  const result = historyText({ message: 'url', history: [], input, output })
  input.write('\x04')

  expect(isCancel(await result)).toBe(true)
  expect(rendered).toContain('\x1b[?25h')
})
