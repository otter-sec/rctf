import { MailProvider, type Mail } from './base'

export default class PostmarkProvider extends MailProvider {
  private readonly serverToken: string

  constructor(_options: any) {
    super()
    const serverToken: string | undefined =
      process.env.RCTF_POSTMARK_SERVER_TOKEN ?? _options.serverToken
    if (!serverToken) {
      throw new Error(
        'Missing postmark token. It can be set from the config via `serverToken` or with the `RCTF_POSTMARK_SERVER_TOKEN` env var'
      )
    }

    this.serverToken = serverToken
  }

  async send(mail: Mail): Promise<void> {
    const resp = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'x-postmark-server-token': this.serverToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        From: mail.from,
        To: mail.to,
        Subject: mail.subject,
        HtmlBody: mail.html,
        TextBody: mail.text,
      }),
    })

    if (resp.status !== 200) {
      throw new Error(`Postmark error ${resp.status}: ${await resp.text()}`)
    }
  }
}
