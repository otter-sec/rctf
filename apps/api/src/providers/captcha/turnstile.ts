import type { Csp } from '../base'
import { CaptchaProvider, type CaptchaOptions } from './base'

export default class TurnstileProvider extends CaptchaProvider {
  private readonly secretKey: string
  private readonly siteKey: string

  constructor(_options: any) {
    super()
    const options = _options as Partial<{ secretKey: string; siteKey: string }>
    const secretKey = process.env.RCTF_TURNSTILE_SECRET_KEY ?? options.secretKey
    const siteKey = process.env.RCTF_TURNSTILE_SITE_KEY ?? options.siteKey

    if (!secretKey || !siteKey) {
      throw new Error('Missing turnstile secret key or site key.')
    }

    this.secretKey = secretKey
    this.siteKey = siteKey
  }

  getPublicOptions(): Record<string, string> {
    return {
      siteKey: this.siteKey,
    }
  }

  // https://developers.cloudflare.com/turnstile/reference/content-security-policy
  override getCspRules(): Csp {
    return {
      'frame-src': ['https://challenges.cloudflare.com'],
    }
  }

  async validate(options: CaptchaOptions): Promise<boolean> {
    const response = await fetch(
      `https://challenges.cloudflare.com/turnstile/v0/siteverify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: this.secretKey,
          response: options.code,
          remoteip: options.ip,
        }),
      }
    )
    const data = (await response.json()) as { success?: boolean }
    return Boolean(data.success)
  }
}
