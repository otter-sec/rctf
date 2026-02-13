import type { BrowserContext } from 'puppeteer-core'
import type { Logger } from 'pino'
import type { HooksConfig } from './browser/hooks'
import type { OutputHandler } from './core/output'

export interface JobMetadata {
  challengeId: string
  configRevision: string
  userId: string
  submittedAt: Date

  flag: string

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

  inputs: Record<string, string>
  maxLogLines?: number | null
  maxLogValueChars?: number | null

  browser?: 'chrome' | 'firefox'
  browserArguments?: Array<string>
  browserVersion?: string
  handler: (ctx: ChallengeContext) => Promise<void>
  puppeteerLaunchOptionsExtra?: Record<string, unknown>

  hooksConfig?: HooksConfig
  restrictDomains?: Record<string, Array<string>>

  requireInstancerInstancesRunning?: boolean
}

export class Challenge {
  public readonly config: ChallengeConfig

  constructor(config: ChallengeConfig) {
    this.config = config
    this.validateInputs()
  }

  private validateInputs(): void {
    for (const [key, value] of Object.entries(this.config.inputs)) {
      try {
        new RegExp(value)
      } catch (err) {
        throw new Error(`Regex pattern ${value} for value ${key} is invalid`)
      }
    }
  }
}
