import type { CaptchaOptions, CaptchaProvider } from './base'

export default class TurnstileProvider implements CaptchaProvider {
  private readonly secretKey: string
  private readonly siteKey: string

  constructor(_options: any) {
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
