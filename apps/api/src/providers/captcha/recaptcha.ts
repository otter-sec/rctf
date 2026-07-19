import type { Csp } from '../base'
import { CaptchaProvider, type CaptchaOptions } from './base'

export default class RecaptchaProvider extends CaptchaProvider {
  private readonly secretKey: string
  private readonly siteKey: string

  constructor(_options: any) {
    super()
    const options = _options as Partial<{ secretKey: string; siteKey: string }>
    const secretKey = process.env.RCTF_RECAPTCHA_SECRET_KEY ?? options.secretKey
    const siteKey = process.env.RCTF_RECAPTCHA_SITE_KEY ?? options.siteKey

    if (!secretKey || !siteKey) {
      throw new Error('Missing recaptcha secret key or site key.')
    }

    this.secretKey = secretKey
    this.siteKey = siteKey
  }

  getPublicOptions(): Record<string, string> {
    return {
      siteKey: this.siteKey,
    }
  }

  // https://developers.google.com/recaptcha/docs/faq#im-using-content-security-policy-csp-on-my-website.-how-can-i-configure-it-to-work-with-recaptcha
  override getCspRules(): Csp {
    return {
      'connect-src': ['https://www.google.com/recaptcha/'],
      'frame-src': [
        'https://www.google.com/recaptcha/',
        'https://recaptcha.google.com/recaptcha/',
      ],
    }
  }

  async validate(options: CaptchaOptions): Promise<boolean> {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
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
