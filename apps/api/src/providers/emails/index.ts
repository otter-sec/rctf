import type { MailProvider } from './base'
import MailgunProvider from './mailgun'
import PostmarkProvider from './postmark'
import SesProvider from './ses'
import SmtpProvider from './smtp'

export const emailProviders: Record<string, (options: any) => MailProvider> = {
  'emails/smtp': (options: any) => new SmtpProvider(options),
  'emails/ses': (options: any) => new SesProvider(options),
  'emails/postmark': (options: any) => new PostmarkProvider(options),
  'emails/mailgun': (options: any) => new MailgunProvider(options),
}
