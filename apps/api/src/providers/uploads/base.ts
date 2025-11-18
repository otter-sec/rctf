import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'

export interface UploadProvider {
  startupWebPart: (app: Hono<AppEnv>) => Promise<void>
  upload: (data: Buffer, name: string) => Promise<string>
  getUrl: (sha256: string, name: string) => Promise<string | null>
}
