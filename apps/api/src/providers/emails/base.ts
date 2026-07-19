import { BaseProvider } from '../base'

export interface Mail {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

export abstract class MailProvider extends BaseProvider {
  abstract send(options: Mail): Promise<void>
}
