import type { Logger } from 'pino'
import type { BrowserContext } from 'puppeteer-core'
import type { HooksConfig } from './browser/hooks'
import type { OutputHandler } from './core/output'
import type { RegexRule, RestrictedDomainsConfig } from './core/pac'

export interface JobMetadata {
  challengeId: string
  configRevision: string
  userId: string
  submittedAt: Date

  flag: string

  remotes: {
    kind: string
    host: string
    port: number
    title?: string
  }[]

  instancerInstances: {
    type: string
    host: string
    port: number
    title?: string
  }[]
}

export interface ChallengeContext {
  logger: Logger
  browserContext: BrowserContext

  input: Record<string, string>
  output: OutputHandler

  job: JobMetadata
}

export interface ChallengeConfig {
  timeoutMilliseconds: number

  inputs: Record<string, RegexRule>
  maxLogLines?: number | null
  maxLogValueChars?: number | null

  browser?: 'chrome' | 'firefox'
  browserArguments?: Array<string>
  browserVersion?: string
  handler: (ctx: ChallengeContext) => Promise<void>
  puppeteerLaunchOptionsExtra?: Record<string, unknown>
  extraPrefsFirefox?: Record<string, unknown>

  hooksConfig: HooksConfig
  restrictDomains?: RestrictedDomainsConfig

  requireInstancerInstancesRunning?: boolean
}

export class Challenge {
  public readonly config: ChallengeConfig

  constructor(config: ChallengeConfig) {
    this.config = config
    this.validate()
  }

  private validate(): void {
    const validateRegexp = (
      pattern: string,
      name: string,
      flags?: string
    ): void => {
      try {
        new RegExp(pattern, flags)
      } catch (err) {
        throw new Error(`Regex pattern ${pattern} of ${name} is invalid`)
      }
    }

    for (const [key, value] of Object.entries(this.config.inputs)) {
      validateRegexp(value.pattern, key, value.flags)
    }

    if (this.config.restrictDomains) {
      for (const [scope, set] of Object.entries(this.config.restrictDomains)) {
        for (const rule of set?.allowRegex ?? []) {
          validateRegexp(
            rule.pattern,
            `restrictDomains.${scope}.allowRegex`,
            rule.flags
          )
        }
        for (const rule of set?.disallowRegex ?? []) {
          validateRegexp(
            rule.pattern,
            `restrictDomains.${scope}.disallowRegex`,
            rule.flags
          )
        }
      }
    }
  }
}
