import type { BrowserContext } from 'puppeteer'
import type { Logger } from 'pino'
import type { HooksConfig } from './browser/hooks'

export interface OutputHandler {
  writeLine(line: string): Promise<void>
  flush(): Promise<void>
  close(): Promise<void>
}

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
  maxOutputChars?: number | null

  browser?: 'chrome' | 'firefox'
  browserArguments?: Array<string>
  browserVersion?: string
  handler: (ctx: ChallengeContext) => Promise<void>
  puppeteerLaunchOptionsExtra?: Record<string, unknown>

  hooksConfig?: HooksConfig
  restrictDomains?: Record<string, Array<string>>
}

export class Challenge {
  public readonly config: ChallengeConfig

  constructor(config: ChallengeConfig) {
    this.config = config
    // Maybe we will add some more stuff here at some point?...
  }
}
