import { resolve } from 'path'
import { BrowserManager } from '../../../apps/admin-bot/src/browser/manager'
import { ChallengeLoader } from '../../../apps/admin-bot/src/core/loader'
import { BufferedOutputHandler } from '../../../apps/admin-bot/src/core/output'
import type {
  RegexRule,
  RestrictedDomainsConfig,
} from '../../../apps/admin-bot/src/core/pac'
import { handleSubmission } from '../../../apps/admin-bot/src/core/runner'
import type { JobMetadata } from '../../../apps/admin-bot/src/types'

const BROWSER_CACHE_DIR = resolve(import.meta.dir, '..', '.browser-cache')
export const browserManager = new BrowserManager(BROWSER_CACHE_DIR)

export const browsers = ['chrome', 'firefox'] as const
export type BrowserType = (typeof browsers)[number]

export interface ParsedLog {
  time: number
  level: string
  prefix: string
  line: string
  extra: Record<string, unknown>
}

export interface RunResult {
  success: boolean
  logs: string
  parsed: ParsedLog[]
}

export const htmlPage = (html: string): string =>
  `data:text/html;base64,${Buffer.from(html).toString('base64')}`

export const challengeSource = (opts: {
  handler: string
  timeout?: number
  inputs?: Record<string, RegexRule>
  hooksConfig?: {
    showConsoleLogs?: boolean
    showBrowserErrors?: boolean
    showNavigation?: boolean
    limitTabsNumber?: number
  }
  browser?: 'chrome' | 'firefox'
  browserArguments?: string[]
  extraPrefsFirefox?: Record<string, unknown>
  restrictDomains?: RestrictedDomainsConfig
  maxLogLines?: number
  maxLogValueChars?: number
}): string => {
  const {
    handler,
    timeout = 10_000,
    inputs = {},
    hooksConfig = {},
    browser = 'chrome',
    browserArguments,
    extraPrefsFirefox,
    restrictDomains,
    maxLogLines,
    maxLogValueChars,
  } = opts

  const hooks = {
    showConsoleLogs: hooksConfig.showConsoleLogs ?? true,
    showBrowserErrors: hooksConfig.showBrowserErrors ?? true,
    showNavigation: hooksConfig.showNavigation ?? true,
    limitTabsNumber: hooksConfig.limitTabsNumber ?? -1,
  }

  return `
const { Challenge } = require('../types')
export const challenge = new Challenge({
  timeoutMilliseconds: ${timeout},
  inputs: ${JSON.stringify(inputs)},
  browser: '${browser}',
  handler: async (ctx) => {
${handler}
  },
  hooksConfig: ${JSON.stringify(hooks)},${browserArguments ? `\n  browserArguments: ${JSON.stringify(browserArguments)},` : ''}${extraPrefsFirefox ? `\n  extraPrefsFirefox: ${JSON.stringify(extraPrefsFirefox)},` : ''}${restrictDomains ? `\n  restrictDomains: ${JSON.stringify(restrictDomains)},` : ''}${maxLogLines !== undefined ? `\n  maxLogLines: ${maxLogLines},` : ''}${maxLogValueChars !== undefined ? `\n  maxLogValueChars: ${maxLogValueChars},` : ''}
})`
}

let testCounter = 0
export const runChallenge = async (opts: {
  source: string
  inputs?: Record<string, string>
}): Promise<RunResult> => {
  const id = `e2e-${++testCounter}`
  const loader = new ChallengeLoader()

  const challenge = await loader.loadFromSource(id, 'rev-1', opts.source)
  if (!challenge) {
    throw new Error('Failed to load challenge source')
  }

  const output = new BufferedOutputHandler(
    challenge.config.maxLogLines,
    challenge.config.maxLogValueChars
  )

  const job: JobMetadata = {
    challengeId: id,
    configRevision: 'rev-1',
    userId: 'test-user',
    submittedAt: new Date(),
    flag: 'flag{test}',
    instancerInstances: [],
  }

  let success = true
  try {
    await handleSubmission(
      loader,
      browserManager,
      job,
      opts.inputs ?? {},
      output
    )
  } catch {
    success = false
  }
  output.close()

  const logs = output.getOutput()
  const parsed: ParsedLog[] = logs
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter((v): v is ParsedLog => v !== null)

  return { success, logs, parsed }
}
