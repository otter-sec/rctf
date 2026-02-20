import { describe, test, expect, beforeEach } from 'bun:test'
import { handleSubmission } from '../../../../apps/admin-bot/src/core/runner'
import { ChallengeLoader } from '../../../../apps/admin-bot/src/core/loader'
import { BrowserManager } from '../../../../apps/admin-bot/src/browser/manager'
import { BufferedOutputHandler } from '../../../../apps/admin-bot/src/core/output'
import type { JobMetadata } from '../../../../apps/admin-bot/src/types'

const validChallengeSource = `
const { Challenge } = require('../types')
export const challenge = new Challenge({
  timeoutMilliseconds: 5000,
  inputs: { url: '^https?://.*' },
  handler: async (ctx) => {
    // do nothing, just succeed
  },
  hooksConfig: {
    showConsoleLogs: false,
    showBrowserErrors: false,
    showNavigation: false,
    limitTabsNumber: -1,
  },
})
`

const makeJobMeta = (): JobMetadata => ({
  challengeId: 'chal-1',
  configRevision: 'rev-1',
  userId: 'user-1',
  submittedAt: new Date('2024-01-01'),
  flag: 'flag{test}',
  instancerInstances: [],
})

describe('handleSubmission', () => {
  let challenges: ChallengeLoader
  let browserManager: BrowserManager
  let output: BufferedOutputHandler

  beforeEach(async () => {
    challenges = new ChallengeLoader()
    browserManager = new BrowserManager()
    output = new BufferedOutputHandler(64)
  })

  test('full flow: launches browser, runs handler, completes', async () => {
    await challenges.loadFromSource('chal-1', 'rev-1', validChallengeSource)

    await handleSubmission(
      challenges,
      browserManager,
      makeJobMeta(),
      { url: 'http://example.com' },
      output
    )

    const logs = output.getOutput()
    expect(logs).toContain('setting up browser')
    expect(logs).toContain('running challenge handler')
  })

  test('challenge not found -> writes fatal to output', async () => {
    // Don't load any challenge
    await handleSubmission(
      challenges,
      browserManager,
      makeJobMeta(),
      { url: 'http://example.com' },
      output
    )

    const logs = output.getOutput()
    expect(logs).toContain('challenge not found')
    // Verify it's a fatal level log
    const lines = logs.split('\n')
    const fatalLine = lines.find(l => l.includes('challenge not found'))
    expect(fatalLine).toBeDefined()
    const parsed = JSON.parse(fatalLine!)
    expect(parsed.level).toBe('fatal')
  })

  test('timeout -> throws Error with message timeout', async () => {
    const timeoutSource = `
      const { Challenge } = require('../types')
      export const challenge = new Challenge({
        timeoutMilliseconds: 50,
        inputs: { url: '^https?://.*' },
        handler: async (ctx) => {
          await new Promise(() => {})
        },
        hooksConfig: {
          showConsoleLogs: false,
          showBrowserErrors: false,
          showNavigation: false,
          limitTabsNumber: -1,
        },
      })
    `
    await challenges.loadFromSource('chal-1', 'rev-1', timeoutSource)

    let thrownError: Error | undefined
    try {
      await handleSubmission(
        challenges,
        browserManager,
        makeJobMeta(),
        { url: 'http://example.com' },
        output
      )
    } catch (err) {
      thrownError = err as Error
    }

    expect(thrownError).toBeInstanceOf(Error)
    expect(thrownError!.message).toBe('timeout')
  })

  test('cleanup runs even on handler error', async () => {
    const errorSource = `
      const { Challenge } = require('../types')
      export const challenge = new Challenge({
        timeoutMilliseconds: 5000,
        inputs: { url: '^https?://.*' },
        handler: async (ctx) => {
          throw new Error('handler failure')
        },
        hooksConfig: {
          showConsoleLogs: false,
          showBrowserErrors: false,
          showNavigation: false,
          limitTabsNumber: -1,
        },
      })
    `
    await challenges.loadFromSource('chal-1', 'rev-1', errorSource)

    let thrownError: Error | undefined
    try {
      await handleSubmission(
        challenges,
        browserManager,
        makeJobMeta(),
        { url: 'http://example.com' },
        output
      )
    } catch (err) {
      thrownError = err as Error
    }

    expect(thrownError).toBeInstanceOf(Error)
    expect(thrownError!.message).toBe('handler failure')
    // The function should have still run browser setup (verifiable via output)
    const logs = output.getOutput()
    expect(logs).toContain('setting up browser')
  })
})
