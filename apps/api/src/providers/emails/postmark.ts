import type { Mail, MailProvider } from './base'

export default class PostmarkProvider implements MailProvider {
  private readonly serverToken: string

  constructor(_options: any) {
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
    await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'x-postmark-server-token': this.serverToken,
      },
      body: JSON.stringify({
        From: mail.from,
        To: mail.to,
        Subject: mail.subject,
        HtmlBody: mail.html,
        TextBody: mail.text,
      }),
    })
  }
}
