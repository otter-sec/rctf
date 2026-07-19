import nodemailer from 'nodemailer'
import Mailer from 'nodemailer/lib/mailer'
import { MailProvider, type Mail } from './base'

export default class SmtpProvider extends MailProvider {
  private readonly mailer: Mailer

  constructor(_options: any) {
    super()
    const options = _options as Partial<{ smtpUrl: string }>
    const url = process.env.RCTF_SMTP_URL ?? options.smtpUrl
    if (!url) {
      throw new Error(
        'Missing smtp url. It can be set from the config via `smtpUrl` or with the `RCTF_SMTP_URL` env var'
      )
    }

    this.mailer = nodemailer.createTransport({
      url,
    })
  }

  async send(mail: Mail): Promise<void> {
    await this.mailer.sendMail(mail)
  }
}
