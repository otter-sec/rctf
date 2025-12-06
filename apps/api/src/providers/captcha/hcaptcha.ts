import type { CaptchaOptions, CaptchaProvider } from './base'

export default class HCaptchaProvider implements CaptchaProvider {
  private readonly secretKey: string
  private readonly siteKey: string

  constructor(_options: any) {
    const options = _options as Partial<{ secretKey: string; siteKey: string }>
    const secretKey = process.env.RCTF_HCAPTCHA_SECRET_KEY ?? options.secretKey
    const siteKey = process.env.RCTF_HCAPTCHA_SITE_KEY ?? options.siteKey

    if (!secretKey || !siteKey) {
      throw new Error('Missing hcaptcha secret key or site key.')
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
    const response = await fetch(`https://hcaptcha.com/siteverify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: this.secretKey,
        response: options.code,
        remoteip: options.ip,
      }),
    })
    const data = (await response.json()) as { success?: boolean }
    return Boolean(data.success)
  }
}
