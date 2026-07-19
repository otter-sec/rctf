import type { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'
import type { AppEnv } from '../../lib/app-env'
import { BaseProvider } from '../base'

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

export abstract class AdminBotProvider extends BaseProvider {
  abstract readonly configLanguage: AdminBotConfigLanguage
  abstract readonly configFileExtension: string
  abstract readonly authMiddleware: MiddlewareHandler

  abstract startupWebPart(app: Hono<AppEnv>): Promise<void>
  abstract loadConfig(config: string): Promise<LoadedAdminBotConfig | string>
}
