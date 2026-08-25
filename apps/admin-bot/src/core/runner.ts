import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withTimeout } from '@rctf/util'
import { applyHooks } from '../browser/hooks'
import { BrowserManager, type ManagedBrowser } from '../browser/manager'
import type { ChallengeContext, JobMetadata } from '../types'
import type { ChallengeLoader } from './loader'
import { createLogger } from './logger'
import { OutputHandler } from './output'

const logger = createLogger('runner')
export const handleSubmission = async (
  challenges: ChallengeLoader,
  browserManager: BrowserManager,
  job: JobMetadata,
  input: Record<string, string>,
  output: OutputHandler
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

  let managed: ManagedBrowser | undefined
  let visitCtx: ChallengeContext | undefined
  let handlerFailure: { error: unknown } | undefined
  try {
    managed = await browserManager.launchBrowser({
      version: {
        browser: challenge.config.browser,
        version: challenge.config.browserVersion,
      },
      timeoutMilliseconds: challenge.config.timeoutMilliseconds,
      arguments: challenge.config.browserArguments,
      restrictedDomains: challenge.config.restrictDomains,
      extraPrefsFirefox: challenge.config.extraPrefsFirefox,
      puppeteerLaunchOptionsExtra: {
        ...challenge.config.puppeteerLaunchOptionsExtra,
        userDataDir,
      },
    })

    visitCtx = {
      logger: log.child({ module: 'challenge-handler' }),
      browserContext: await managed.browser.createBrowserContext(),
      input,
      output,
      job,
    }

    await applyHooks(
      visitCtx.output,
      managed.browser,
      challenge.config.hooksConfig
    )

    log.info('running challenge handler')
    output.info('admin-bot', 'running challenge handler')

    try {
      await withTimeout(
        challenge.config.handler(visitCtx),
        challenge.config.timeoutMilliseconds,
        () => {
          throw new Error('timeout')
        }
      )
    } catch (err) {
      handlerFailure = { error: err }
      if (err instanceof Error && err.message === 'timeout') {
        log.warn('challenge timed out')
      } else {
        log.error({ err }, 'challenge failed')
      }
    }
  } finally {
    const cleanup = async (
      action: (() => Promise<unknown>) | undefined,
      message: string,
      extra = {}
    ) => {
      if (!action) return
      try {
        await action()
      } catch (err) {
        log.warn({ err, ...extra }, message)
      }
    }

    // Start proxy shutdown before awaiting browser-controlled cleanup.
    const managedBrowser = managed
    const browserContext = visitCtx?.browserContext
    const browserClose = cleanup(
      managedBrowser && (() => managedBrowser.close()),
      'failed to close browser'
    )
    await cleanup(
      browserContext && (() => browserContext.close()),
      'failed to close browser context'
    )
    await browserClose
    await cleanup(
      () => rm(userDataDir, { recursive: true, force: true }),
      'failed to clean up temp directory',
      { userDataDir }
    )
  }
  log.info('visited')

  if (handlerFailure) throw handlerFailure.error
}
