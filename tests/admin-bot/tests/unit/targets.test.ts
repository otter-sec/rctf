import { describe, expect, test } from 'bun:test'
import type { HooksConfig } from '../../../../apps/admin-bot/src/browser/hooks'
import { TargetTracker } from '../../../../apps/admin-bot/src/browser/hooks/targets'
import { BufferedOutputHandler } from '../../../../apps/admin-bot/src/core/output'

interface ParsedLog {
  level: string
  prefix: string
  line: string
  extra: Record<string, unknown>
}

const defaultConfig: HooksConfig = {
  showConsoleLogs: true,
  showBrowserErrors: true,
  showNavigation: true,
  showDialogs: true,
  autoDismissDialogs: false,
  limitTabsNumber: -1,
  limitTabsNumberShowError: true,
}

const createPageTarget = (id: string, url: string = 'about:blank'): any => ({
  _targetId: id,
  type: () => 'page',
  url: () => url,
  page: async () => null,
})

const parseLogs = (output: BufferedOutputHandler): ParsedLog[] => {
  return output
    .getOutput()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

describe('TargetTracker', () => {
  test('enforces tab limit using active tabs only', async () => {
    const output = new BufferedOutputHandler()
    let closedCount = 0
    const browser = {
      close: async () => {
        closedCount++
      },
    } as any
    const tracker = new TargetTracker(output, browser, {
      ...defaultConfig,
      limitTabsNumber: 1,
    })

    const firstTab = createPageTarget('tab-1', 'https://first.test')
    const secondTab = createPageTarget('tab-2', 'https://second.test')

    await tracker.onTargetCreated(firstTab)
    tracker.onTargetDestroyed(firstTab)
    await tracker.onTargetCreated(secondTab)

    const parsed = parseLogs(output)
    const created = parsed.filter(
      line => line.prefix === 'navigation' && line.line.includes('tab created')
    )

    expect(closedCount).toBe(0)
    expect(parsed.some(line => line.line.includes('tab limit exceeded'))).toBe(
      false
    )
    expect(created.map(line => line.extra.id)).toEqual(['T1', 'T1'])
  })

  test('closes browser when concurrent tabs exceed limit', async () => {
    const output = new BufferedOutputHandler()
    let closedCount = 0
    const browser = {
      close: async () => {
        closedCount++
      },
    } as any
    const tracker = new TargetTracker(output, browser, {
      ...defaultConfig,
      limitTabsNumber: 1,
    })

    await tracker.onTargetCreated(createPageTarget('tab-1', 'https://one.test'))
    await tracker.onTargetCreated(createPageTarget('tab-2', 'https://two.test'))

    const parsed = parseLogs(output)
    expect(closedCount).toBe(1)
    expect(parsed.some(line => line.line.includes('tab limit exceeded'))).toBe(
      true
    )
  })

  test('closes browser silently when limitTabsNumberShowError is off', async () => {
    const output = new BufferedOutputHandler()
    let closedCount = 0
    const browser = {
      close: async () => {
        closedCount++
      },
    } as any
    const tracker = new TargetTracker(output, browser, {
      ...defaultConfig,
      limitTabsNumber: 1,
      limitTabsNumberShowError: false,
    })

    await tracker.onTargetCreated(createPageTarget('tab-1', 'https://one.test'))
    await tracker.onTargetCreated(createPageTarget('tab-2', 'https://two.test'))

    const parsed = parseLogs(output)
    expect(closedCount).toBe(1)
    expect(parsed.some(line => line.line.includes('tab limit exceeded'))).toBe(
      false
    )
  })

  test('logs T? for page close events that were not tracked', () => {
    const output = new BufferedOutputHandler()
    const tracker = new TargetTracker(
      output,
      { close: async () => {} } as any,
      defaultConfig
    )

    tracker.onTargetDestroyed(createPageTarget('missing-tab'))

    const parsed = parseLogs(output)
    const closeLog = parsed.find(
      line => line.prefix === 'navigation' && line.line.includes('tab closed')
    )
    expect(closeLog).toBeDefined()
    expect(closeLog?.extra.id).toBe('T?')
  })
})
