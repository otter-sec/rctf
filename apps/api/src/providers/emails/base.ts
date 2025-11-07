export interface Mail {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

export interface MailProvider {
  send: (options: Mail) => Promise<void>
}
