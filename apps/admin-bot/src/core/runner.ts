import type { ChallengeLoader } from './loader'
import { join } from 'node:path'
import { BrowserManager } from '../browser/manager'
import { OutputHandler } from './output'
import type { ChallengeContext, JobMetadata } from '../types'
import { applyHooks } from '../browser/hooks'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { createLogger } from './logger'

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

  const browser = await browserManager.launchBrowser({
    version: {
      browser: challenge.config.browser,
      version: challenge.config.browserVersion,
    },
    arguments: challenge.config.browserArguments,
    restrictedDomains: challenge.config.restrictDomains,
    puppeteerLaunchOptionsExtra: {
      userDataDir,
    },
  })

  const visitCtx: ChallengeContext = {
    logger: log.child({ module: 'challenge-handler' }),
    browserContext: await browser.createBrowserContext(),
    input: input,
    output: output,
    job: job,
  }

  await applyHooks(visitCtx.output, browser, challenge.config.hooksConfig)

  let handlerError: unknown = undefined
  try {
    output.info('admin-bot', 'running challenge handler')
    await Promise.race([
      challenge.config.handler(visitCtx),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('timeout')),
          challenge.config.timeoutMilliseconds
        )
      }),
    ])
  } catch (err) {
    handlerError = err
    if (err instanceof Error && err.message === 'timeout') {
      log.warn('challenge timed out')
    } else {
      log.error({ err }, 'challenge failed')
    }
  } finally {
    try {
      await visitCtx.browserContext.close()
    } catch (err) {
      log.warn({ err }, 'failed to close browser context')
    }

    try {
      await browser.close()
    } catch (err) {
      log.warn({ err }, 'failed to close browser')
    }

    try {
      await rm(userDataDir, { recursive: true, force: true })
    } catch (err) {
      log.warn({ err, userDataDir }, 'failed to clean up temp directory')
    }
  }
  log.info('visited')

  if (handlerError) {
    throw handlerError
  }
}
