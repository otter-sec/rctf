import { BrowserManager } from '../browser/manager'
import type { ChallengeLoader } from './loader'
import { createLogger } from './logger'
import { BufferedOutputHandler } from './output'
import type { PlatformClient, PulledJob } from './platform'
import { handleSubmission } from './runner'

const logger = createLogger('poller')
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000)

export const ensureChallengeLoaded = async (
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

export const processJob = async (
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
  const output = new BufferedOutputHandler(
    challenge.config.maxLogLines,
    challenge.config.maxLogValueChars
  )

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
    output.info('admin-bot', 'finished visiting')
    await platform.completeJob(job.id, output.getOutput())
  } catch (err) {
    log.error({ err }, 'job failed')
    if (err instanceof Error && err.message === 'timeout') {
      output.fatal('admin-bot', 'timed out')
    } else {
      output.fatal('admin-bot', 'hit internal server error')
    }
    await platform.failJob(job.id, output.getOutput())
  } finally {
    output.close()
  }
}

export interface PollerHandle {
  shutdown: () => Promise<void>
}

export const startPoller = (
  challenges: ChallengeLoader,
  browserManager: BrowserManager,
  platform: PlatformClient
): PollerHandle => {
  let current: Promise<void> | null = null
  let stopped = false

  // NOTE(es3n1n): Do we want to speed this up a bit by having concurrency?
  const poll = () => {
    if (current || stopped) {
      return
    }

    current = (async () => {
      try {
        const job = await platform.pullJob()
        if (!job) {
          return
        }

        await processJob(challenges, browserManager, platform, job)
      } catch (err) {
        logger.error({ err }, 'polling error')
      } finally {
        current = null
      }
    })()
  }

  logger.info({ intervalMs: POLL_INTERVAL_MS }, 'starting job poller')
  const interval = setInterval(poll, POLL_INTERVAL_MS)
  poll()

  return {
    shutdown: async () => {
      stopped = true
      clearInterval(interval)
      if (current) {
        logger.info('waiting for in-flight job to finish')
        await current
      }
    },
  }
}
