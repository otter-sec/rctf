import { BrowserManager } from './browser/manager'
import { ChallengeLoader } from './core/loader'
import { BufferedOutputHandler } from './core/output'
import { handleSubmission } from './core/runner'
import type { ResolvedChallengeConfig } from './types'
import type {
  LocalInspection,
  LocalRunResult,
  LocalRunnerEvent,
  LocalRunnerRequest,
} from './local-protocol'
import { encodeLocalRunnerEvent } from './local-protocol'

const loadChallenge = async (loader: ChallengeLoader, source: string) => {
  const challenge = await loader.loadChallenge(source)
  if (typeof challenge === 'string') {
    throw new Error(challenge)
  }
  return challenge
}

const hasDomainRestrictions = (config: ResolvedChallengeConfig): boolean => {
  const restrictedDomains = config.restrictDomains
  return [restrictedDomains?.host, restrictedDomains?.url].some(
    rules => (rules?.disallowRegex?.length ?? 0) > 0
  )
}

export const inspectLocalChallenge = async (
  source: string
): Promise<LocalInspection> => {
  const challenge = await loadChallenge(new ChallengeLoader(), source)
  return {
    inputs: challenge.config.inputs,
    timeoutMilliseconds: challenge.config.timeoutMilliseconds,
    requireInstancerInstancesRunning:
      challenge.config.requireInstancerInstancesRunning === true,
    hasDomainRestrictions: hasDomainRestrictions(challenge.config),
    browser: challenge.config.browser ?? 'chrome',
  }
}

export const runLocalChallenge = async (
  request: Extract<LocalRunnerRequest, { action: 'run' }>,
  onLine?: (line: string) => void,
  browserCacheDir = process.env.BROWSER_CACHE_DIR
): Promise<LocalRunResult> => {
  const loader = new ChallengeLoader()
  const challenge = await loadChallenge(loader, request.source)

  loader.register(
    request.job.challengeId,
    request.job.configRevision,
    challenge
  )
  const output = new BufferedOutputHandler(
    challenge.config.maxLogLines,
    challenge.config.maxLogValueChars,
    request.options.live ? onLine : undefined
  )
  const browserManager = new BrowserManager(browserCacheDir)

  let succeeded = false
  try {
    await handleSubmission(
      loader,
      browserManager,
      {
        ...request.job,
        submittedAt: new Date(request.job.submittedAt),
      },
      request.inputs,
      output,
      request.options
    )
    output.info('admin-bot', 'finished visiting')
    succeeded = true
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      output.fatal('admin-bot', 'timed out')
    } else {
      output.fatal('admin-bot', 'local admin-bot run failed', {
        error: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack
          ? { stack: error.stack }
          : {}),
      })
    }
  } finally {
    output.close()
  }

  return { succeeded, logs: output.getOutput() }
}

const isRequest = (value: unknown): value is LocalRunnerRequest => {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const request = value as { action?: unknown; source?: unknown }
  return (
    (request.action === 'inspect' || request.action === 'run') &&
    typeof request.source === 'string'
  )
}

const emit = (event: LocalRunnerEvent): void => {
  // Start on a fresh line even if challenge code wrote an unterminated line.
  process.stdout.write(`\n${encodeLocalRunnerEvent(event)}\n`)
}

const main = async (): Promise<void> => {
  try {
    const request: unknown = JSON.parse(await Bun.stdin.text())
    if (!isRequest(request)) {
      throw new Error('Invalid local runner request')
    }

    if (request.action === 'inspect') {
      emit({
        type: 'inspection',
        inspection: await inspectLocalChallenge(request.source),
      })
      return
    }

    const result = await runLocalChallenge(request, line =>
      emit({ type: 'log', line })
    )
    emit({ type: 'result', ...result })
    if (!result.succeeded) {
      process.exitCode = 1
    }
  } catch (error) {
    emit({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
    process.exitCode = 1
  }
}

if (import.meta.main) {
  await main()
}
