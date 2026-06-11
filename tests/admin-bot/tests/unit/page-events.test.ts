import { describe, expect, test } from 'bun:test'
import {
  resolveHooksConfig,
  type HooksConfig,
} from '../../../../apps/admin-bot/src/browser/hooks'
import { hookPageEvents } from '../../../../apps/admin-bot/src/browser/hooks/page-events'
import { BufferedOutputHandler } from '../../../../apps/admin-bot/src/core/output'

interface FakePage {
  on: (event: string, cb: (arg: any) => void) => void
  emit: (event: string, arg: any) => void
  has: (event: string) => boolean
}

const fakePage = (): FakePage => {
  const handlers: Record<string, (arg: any) => void> = {}
  return {
    on: (event, cb) => {
      handlers[event] = cb
    },
    emit: (event, arg) => handlers[event]?.(arg),
    has: event => event in handlers,
  }
}

const fakeDialog = () => {
  const dialog = {
    handled: false,
    dismissCount: 0,
    type: () => 'alert',
    message: () => 'boom',
    dismiss: async () => {
      if (dialog.handled) {
        throw new Error('Cannot dismiss dialog which is already handled!')
      }
      dialog.handled = true
      dialog.dismissCount++
    },
  }
  return dialog
}

const run = (config: Partial<HooksConfig>) => {
  const page = fakePage()
  const output = new BufferedOutputHandler()
  hookPageEvents(page as any, 'T1', output, resolveHooksConfig(config))
  return { page, output }
}

const dialogLogs = (output: BufferedOutputHandler) =>
  output
    .getOutput()
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l))
    .filter(l => l.prefix === 'dialog')

describe('dialog hook', () => {
  test('does not attach a dialog listener when both flags are off', () => {
    const { page } = run({})
    expect(page.has('dialog')).toBe(false)
  })

  test('logs but does not dismiss when only showDialogs is on', () => {
    const { page, output } = run({ showDialogs: true })
    const dialog = fakeDialog()
    page.emit('dialog', dialog)

    expect(dialogLogs(output)).toHaveLength(1)
    expect(dialog.handled).toBe(false)
  })

  test('dismisses but does not log when only autoDismissDialogs is on', () => {
    const { page, output } = run({ autoDismissDialogs: true })
    const dialog = fakeDialog()
    page.emit('dialog', dialog)

    expect(dialog.dismissCount).toBe(1)
    expect(dialogLogs(output)).toHaveLength(0)
  })

  test('logs and dismisses when both flags are on', () => {
    const { page, output } = run({
      showDialogs: true,
      autoDismissDialogs: true,
    })
    const dialog = fakeDialog()
    page.emit('dialog', dialog)

    expect(dialogLogs(output)).toHaveLength(1)
    expect(dialog.dismissCount).toBe(1)
  })

  test('does not double-handle a dialog a challenge handler already took', () => {
    const { page } = run({ autoDismissDialogs: true })
    const dialog = fakeDialog()
    dialog.handled = true // simulate ctx handler having accepted/dismissed it
    expect(() => page.emit('dialog', dialog)).not.toThrow()
    expect(dialog.dismissCount).toBe(0)
  })
})
