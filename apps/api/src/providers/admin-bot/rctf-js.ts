import type { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import type { AppEnv } from '../../lib/app-env'
import type { AdminBotProvider, LoadedAdminBotConfig } from './base'
import { AdminBotConfigLanguage } from './base'
import { z } from 'zod/mini'

const RegexRuleSchema = z.object({
  pattern: z.string(),
  flags: z.optional(z.string()),
})

export const TestEndpointResponseSchema = z.object({
  inputs: z.record(z.string(), RegexRuleSchema),
  timeoutMilliseconds: z.number(),
  requireInstancerInstancesRunning: z.boolean(),
})

export default class RctfJSProvider implements AdminBotProvider {
  readonly configLanguage = AdminBotConfigLanguage.TypeScript
  readonly configFileExtension = '.ts'
  readonly authMiddleware

  private readonly secretKey: string
  private readonly endpoint: string

  constructor(_options: any) {
    const options = _options as Partial<{ secretKey: string; endpoint: string }>
    const secretKey = process.env.RCTF_ADMIN_BOT_SECRET_KEY ?? options.secretKey
    const endpoint = process.env.RCTF_ADMIN_BOT_ENDPOINT ?? options.endpoint
    if (!secretKey || !endpoint) {
      throw new Error('Missing admin-bot secretKey or endpoint.')
    }

    this.secretKey = secretKey
    this.endpoint = endpoint.replace(/\/+$/, '')
    this.authMiddleware = bearerAuth({ token: this.secretKey })
  }

  async loadConfig(config: string): Promise<LoadedAdminBotConfig | string> {
    try {
      const result = await fetch(`${this.endpoint}/v1/test`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          source: config,
        }),
      })

      const response = await result.json()
      if (typeof response !== 'object') {
        return 'Got invalid endpoint response'
      }

      if (response && 'detail' in response) {
        return response['detail'] as string
      }

      const parsed = TestEndpointResponseSchema.safeParse(response)
      if (!parsed.success) {
        return parsed.error.message
      }

      return parsed.data
    } catch (err) {
      return `Unable to talk to adminbot endpoint, ${err}`
    }
  }

  async startupWebPart(_app: Hono<AppEnv>): Promise<void> {}
}
