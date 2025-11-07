import { config } from '@rctf/config'
import mustache from 'mustache'
import { emailProvider } from '../providers'

export type EmailKind = 'register' | 'recover' | 'update'

// FIXME(es3n1n): this is sketchy
// TODO(es3n1n): we might want to migrate to eta/handlebars, but that's unfortunately a breaking change
const emailHTML = await Bun.file(
  __dirname + '/../../templates/email.html'
).text()
const emailTXT = await Bun.file(__dirname + '/../../templates/email.txt').text()

export const sendVerificationEmail = async (
  to: string,
  kind: EmailKind,
  token: string
) => {
  if (!emailProvider || !config.email) {
    throw new Error('Email provider is not set.')
  }

  const emailView = {
    ctf_name: config.ctfName,
    logo_url: config.email.logoUrl,
    origin: config.origin,
    token: encodeURIComponent(token),
    register: kind === 'register',
    recover: kind === 'recover',
    update: kind === 'update',
  }
  const subject = {
    register: `Email verification for ${config.ctfName}`,
    recover: `Account recovery for ${config.ctfName}`,
    update: `Update your ${config.ctfName} email`,
  }[kind]

  await emailProvider.send({
    from: `${config.ctfName} <${config.email.from}>`,
    to: to,
    subject,
    html: mustache.render(emailHTML, emailView),
    text: mustache.render(emailTXT, emailView),
  })
}
