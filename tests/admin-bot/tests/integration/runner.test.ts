import { beforeEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import type { Browser, BrowserContext } from 'puppeteer-core'
import { BrowserManager } from '../../../../apps/admin-bot/src/browser/manager'
import { ChallengeLoader } from '../../../../apps/admin-bot/src/core/loader'
import { BufferedOutputHandler } from '../../../../apps/admin-bot/src/core/output'
import { handleSubmission } from '../../../../apps/admin-bot/src/core/runner'
import {
  Challenge,
  type JobMetadata,
} from '../../../../apps/admin-bot/src/types'

const browsers = ['chrome', 'firefox'] as const
const validChallengeSource = (browser: 'chrome' | 'firefox') => `
const { Challenge } = require('../types')
export const challenge = new Challenge({
  timeoutMilliseconds: 5000,
  inputs: { url: { pattern: '^https?://.*' } },
  browser: '${browser}',
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
  flags: [{ provider: 'flags/static', flag: 'flag{test}' }],
  flag: 'flag{test}',
  instancerInstances: [],
})

for (const browser of browsers) {
  describe(`handleSubmission [${browser}]`, () => {
    let challenges: ChallengeLoader
    let browserManager: BrowserManager
    let output: BufferedOutputHandler

    beforeEach(async () => {
      challenges = new ChallengeLoader()
      browserManager = new BrowserManager()
      output = new BufferedOutputHandler(64)
    })

    test('full flow: launches browser, runs handler, completes', async () => {
      await challenges.loadFromSource(
        'chal-1',
        'rev-1',
        validChallengeSource(browser)
      )

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
          inputs: { url: { pattern: '^https?://.*' } },
          browser: '${browser}',
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
          inputs: { url: { pattern: '^https?://.*' } },
          browser: '${browser}',
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
}

describe('handleSubmission browser setup', () => {
  const loadChallenge = async (sourceExtra = '') => {
    const challenges = new ChallengeLoader()
    await challenges.loadFromSource(
      'chal-1',
      'rev-1',
      `
        const { Challenge } = require('../types')
        export const challenge = new Challenge({
          timeoutMilliseconds: 5000,
          inputs: {},
          handler: async () => {},
          ${sourceExtra}
        })
      `
    )
    return challenges
  }

  const fakeContext = (close: () => Promise<void>) =>
    ({ close }) as BrowserContext

  const fakeBrowser = (
    context: BrowserContext,
    close: () => Promise<void>,
    on: () => void = () => undefined
  ) =>
    ({
      createBrowserContext: async () => context,
      close,
      on,
    }) as unknown as Browser

  test('can disable the timeout without changing the challenge config', async () => {
    const challenges = new ChallengeLoader()
    let handlerFinished = false
    challenges.register(
      'chal-1',
      'rev-1',
      new Challenge({
        timeoutMilliseconds: 1,
        inputs: {},
        handler: async () => {
          await Bun.sleep(20)
          handlerFinished = true
        },
      })
    )
    const browserManager = new BrowserManager()
    browserManager.launchBrowser = async () =>
      fakeBrowser(
        fakeContext(async () => undefined),
        async () => undefined
      )

    await handleSubmission(
      challenges,
      browserManager,
      makeJobMeta(),
      {},
      new BufferedOutputHandler(),
      { disableTimeout: true }
    )

    expect(handlerFinished).toBe(true)
  })

  test('does not treat a zero challenge timeout as disabled', async () => {
    const challenges = new ChallengeLoader()
    challenges.register(
      'chal-1',
      'rev-1',
      new Challenge({
        timeoutMilliseconds: 0,
        inputs: {},
        handler: async () => await new Promise(() => {}),
      })
    )
    const browserManager = new BrowserManager()
    browserManager.launchBrowser = async () =>
      fakeBrowser(
        fakeContext(async () => undefined),
        async () => undefined
      )

    await expect(
      handleSubmission(
        challenges,
        browserManager,
        makeJobMeta(),
        {},
        new BufferedOutputHandler()
      )
    ).rejects.toThrow('timeout')
  })

  test('merges extra launch options while protecting the user data directory', async () => {
    const challenges = await loadChallenge(`
      puppeteerLaunchOptionsExtra: {
        devtools: true,
        userDataDir: '/challenge-controlled',
      },
    `)
    const browserManager = new BrowserManager()
    let launchOptions:
      | Parameters<BrowserManager['launchBrowser']>[0]
      | undefined
    browserManager.launchBrowser = async options => {
      launchOptions = options
      return fakeBrowser(
        fakeContext(async () => undefined),
        async () => undefined
      )
    }

    await handleSubmission(
      challenges,
      browserManager,
      makeJobMeta(),
      {},
      new BufferedOutputHandler(),
      { bypassDomainRestrictionOrigins: ['http://localhost:8092'] }
    )

    expect(launchOptions?.puppeteerLaunchOptionsExtra?.devtools).toBe(true)
    expect(launchOptions?.bypassDomainRestrictionOrigins).toEqual([
      'http://localhost:8092',
    ])
    const userDataDir = launchOptions?.puppeteerLaunchOptionsExtra?.userDataDir
    expect(userDataDir).toBeString()
    expect(userDataDir).not.toBe('/challenge-controlled')
    expect(existsSync(userDataDir as string)).toBe(false)
  })

  test('cleans up the browser and context when hook setup fails', async () => {
    const challenges = await loadChallenge()
    const browserManager = new BrowserManager()
    let contextClosed = false
    let browserClosed = false
    let userDataDir: string | undefined
    browserManager.launchBrowser = async options => {
      userDataDir = options.puppeteerLaunchOptionsExtra?.userDataDir as string
      return fakeBrowser(
        fakeContext(async () => {
          contextClosed = true
        }),
        async () => {
          browserClosed = true
        },
        () => {
          throw new Error('hook setup failed')
        }
      )
    }

    await expect(
      handleSubmission(
        challenges,
        browserManager,
        makeJobMeta(),
        {},
        new BufferedOutputHandler()
      )
    ).rejects.toThrow('hook setup failed')

    expect(contextClosed).toBe(true)
    expect(browserClosed).toBe(true)
    expect(userDataDir).toBeString()
    expect(existsSync(userDataDir!)).toBe(false)
  })
})
