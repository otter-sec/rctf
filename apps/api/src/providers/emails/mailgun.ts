import type { Mail, MailProvider } from './base'

export default class MailgunProvider implements MailProvider {
  private readonly apiKey: string
  private readonly domain: string

  constructor(_options: any) {
    const apiKey: string | undefined =
      process.env.RCTF_MAILGUN_API_KEY ?? _options.apiKey
    const domain: string | undefined =
      process.env.RCTF_MAILGUN_DOMAIN ?? _options.domain
    if (!apiKey || !domain) {
      throw new Error(
        `Missing one of the apiKey, domain for the mailgun email provider.`
      )
    }

    this.apiKey = apiKey
    this.domain = domain
  }

  async send(mail: Mail): Promise<void> {
    const resp = await fetch(
      `https://api.mailgun.net/v3/${this.domain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          from: mail.from,
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      }
    )
    if (resp.status !== 200) {
      throw new Error(`Mailgun error ${resp.status}: ${await resp.text()}`)
    }
  }
}
