import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withTimeout } from '@rctf/util'
import type { Browser, BrowserContext } from 'puppeteer-core'
import { applyHooks } from '../browser/hooks'
import { BrowserManager } from '../browser/manager'
import type { ChallengeContext, JobMetadata } from '../types'
import type { ChallengeLoader } from './loader'
import { createLogger } from './logger'
import { OutputHandler } from './output'

const logger = createLogger('runner')

export interface SubmissionOverrides {
  headless?: boolean
  showAllHooks?: boolean
  timeoutMilliseconds?: number
  disableTimeout?: boolean
  bypassDomainRestrictionOrigins?: string[]
}

export const handleSubmission = async (
  challenges: ChallengeLoader,
  browserManager: BrowserManager,
  job: JobMetadata,
  input: Record<string, string>,
  output: OutputHandler,
  overrides: SubmissionOverrides = {}
): Promise<void> => {
  const log = logger.child({ input, job })
  const challenge = challenges.get(job.challengeId, job.configRevision)
  if (!challenge) {
    log.error('challenge not found')
    output.fatal('admin-bot', 'challenge not found')
    return
  }

  log.info('visiting')
  output.info('admin-bot', 'setting up browser')

  const userDataDir = await mkdtemp(join(tmpdir(), `adminbot-${randomUUID()}-`))
  log.debug({ userDataDir }, 'created temp directory')

  let browser: Browser | undefined
  let browserContext: BrowserContext | undefined
  let handlerFailure: { error: unknown } | undefined
  try {
    browser = await browserManager.launchBrowser({
      version: {
        browser: challenge.config.browser,
        version: challenge.config.browserVersion,
      },
      arguments: challenge.config.browserArguments,
      headless: overrides.headless,
      restrictedDomains: challenge.config.restrictDomains,
      bypassDomainRestrictionOrigins: overrides.bypassDomainRestrictionOrigins,
      extraPrefsFirefox: challenge.config.extraPrefsFirefox,
      puppeteerLaunchOptionsExtra: {
        ...challenge.config.puppeteerLaunchOptionsExtra,
        userDataDir,
      },
    })

    browserContext = await browser.createBrowserContext()
    const visitCtx: ChallengeContext = {
      logger: log.child({ module: 'challenge-handler' }),
      browserContext,
      input: input,
      output: output,
      job: job,
    }

    await applyHooks(
      visitCtx.output,
      browser,
      overrides.showAllHooks
        ? {
            ...challenge.config.hooksConfig,
            showConsoleLogs: true,
            showBrowserErrors: true,
            showNavigation: true,
            showDialogs: true,
          }
        : challenge.config.hooksConfig
    )

    log.info('running challenge handler')
    output.info('admin-bot', 'running challenge handler')

    try {
      const handler = challenge.config.handler(visitCtx)
      if (overrides.disableTimeout) {
        await handler
      } else {
        await withTimeout(
          handler,
          overrides.timeoutMilliseconds ?? challenge.config.timeoutMilliseconds,
          () => {
            throw new Error('timeout')
          }
        )
      }
    } catch (err) {
      handlerFailure = { error: err }
      if (err instanceof Error && err.message === 'timeout') {
        log.warn('challenge timed out')
      } else {
        log.error({ err }, 'challenge failed')
      }
    }
  } finally {
    if (browserContext) {
      try {
        await browserContext.close()
      } catch (err) {
        log.warn({ err }, 'failed to close browser context')
      }
    }

    if (browser) {
      try {
        await browser.close()
      } catch (err) {
        log.warn({ err }, 'failed to close browser')
      }
    }

    try {
      await rm(userDataDir, { recursive: true, force: true })
    } catch (err) {
      log.warn({ err, userDataDir }, 'failed to clean up temp directory')
    }
  }
  log.info('visited')

  if (handlerFailure) {
    throw handlerFailure.error
  }
}
