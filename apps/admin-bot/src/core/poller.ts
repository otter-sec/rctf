import { pino } from 'pino'
import type { ChallengeLoader } from './loader'
import type { PlatformClient, PulledJob } from './platform'
import { BrowserManager } from '../browser/manager'
import { handleSubmission } from './runner'
import { BufferedOutputHandler } from './output'
import { log as outputLog } from '../types'

const logger = pino().child({ module: 'poller' })
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000)

const ensureChallengeLoaded = async (
  challenges: ChallengeLoader,
  platform: PlatformClient,
  challengeId: string,
  configRevision: string
): Promise<boolean> => {
  if (challenges.get(challengeId, configRevision)) {
    return true
  }

  const source = await platform.fetchChallengeSource(challengeId)
  if (!source) {
    return false
  }

  // This will load the challenge + cache it
  const challenge = await challenges.loadFromSource(
    challengeId,
    configRevision,
    source.sourceCode
  )
  return challenge !== undefined
}

const processJob = async (
  challenges: ChallengeLoader,
  browserManager: BrowserManager,
  platform: PlatformClient,
  job: PulledJob
): Promise<void> => {
  const log = logger.child({
    jobId: job.id,
    challengeId: job.challengeId,
    userId: job.userId,
  })
  log.info('processing job')

  const loaded = await ensureChallengeLoaded(
    challenges,
    platform,
    job.challengeId,
    job.configRevision
  )

  if (!loaded) {
    log.error('failed to load challenge source')
    await platform.failJob(job.id)
    return
  }

  const challenge = challenges.get(job.challengeId, job.configRevision)!
  const output = new BufferedOutputHandler(challenge.config.maxOutputChars)

  try {
    await handleSubmission(
      challenges,
      browserManager,
      {
        challengeId: job.challengeId,
        configRevision: job.configRevision,
        userId: job.userId,
        submittedAt: new Date(job.submittedAt),
        flag: job.flag,
        instancerInstances: job.instancerInstances,
      },
      job.inputs,
      output
    )

    log.info('job completed successfully')
    outputLog(output, 'admin-bot', 'finished visiting')
    output.flush()
    await platform.completeJob(job.id, output.getOutput())
  } catch (err) {
    log.error({ err }, 'job failed')
    if (err instanceof Error && err.message === 'timeout') {
      outputLog(output, 'admin-bot', 'timed out')
    } else {
      outputLog(output, 'admin-bot', 'hit internal server error')
    }
    output.flush()
    await platform.failJob(job.id, output.getOutput())
  } finally {
    output.close()
  }
}

export const startPoller = (
  challenges: ChallengeLoader,
  browserManager: BrowserManager,
  platform: PlatformClient
): void => {
  let processing = false

  // NOTE(es3n1n): Do we want to speed this up a bit by having concurrency?
  const poll = async () => {
    if (processing) {
      return
    }

    processing = true
    try {
      const job = await platform.pullJob()
      if (!job) {
        return
      }

      await processJob(challenges, browserManager, platform, job)
    } catch (err) {
      logger.error({ err }, 'polling error')
    } finally {
      processing = false
    }
  }

  logger.info({ intervalMs: POLL_INTERVAL_MS }, 'starting job poller')
  setInterval(poll, POLL_INTERVAL_MS)
  poll()
}
