import type { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'
import type { AppEnv } from '../../lib/app-env'

export interface RegexRule {
  pattern: string
  flags?: string
}

export interface LoadedAdminBotConfig {
  inputs: Record<string, RegexRule>
  timeoutMilliseconds: number
  requireInstancerInstancesRunning: boolean
}

export enum AdminBotConfigLanguage {
  TypeScript = 'typescript',
}

export interface AdminBotProvider {
  readonly configLanguage: AdminBotConfigLanguage
  readonly configFileExtension: string
  readonly authMiddleware: MiddlewareHandler

  startupWebPart(app: Hono<AppEnv>): Promise<void>
  loadConfig(config: string): Promise<LoadedAdminBotConfig | string>
}
