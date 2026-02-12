import type { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'
import type { AppEnv } from '../../lib/app-env'

export interface LoadedAdminBotConfig {
  // key is string name, value is regex
  inputs: Record<string, string>
  timeoutMilliseconds: number
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
