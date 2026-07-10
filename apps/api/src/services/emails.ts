import path from 'node:path'
import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import mustache from 'mustache'
import type { TypedRedis } from '../cache/scripts'
import { emailProvider } from '../providers'
import { getResolvedSettings } from './settings'

export type EmailKind = 'register' | 'recover' | 'update'

// FIXME(es3n1n): this is sketchy
// TODO(es3n1n): we might want to migrate to eta/handlebars, but that's unfortunately a breaking change
const emailHTML = await Bun.file(
  path.join(__dirname, '/../../templates/email.html')
).text()
const emailTXT = await Bun.file(
  path.join(__dirname, '/../../templates/email.txt')
).text()

export const sendVerificationEmail = async (
  db: DatabaseClient,
  to: string,
  kind: EmailKind,
  token: string,
  redis?: TypedRedis
) => {
  if (!emailProvider || !config.email) {
    throw new Error('Email provider is not set.')
  }

  const { ctfName, logoLightUrl, logoDarkUrl } = await getResolvedSettings(
    db,
    redis
  )

  const emailView = {
    ctf_name: ctfName,
    logo_light_url: logoLightUrl ?? logoDarkUrl,
    logo_dark_url: logoDarkUrl ?? logoLightUrl,
    origin: config.origin,
    token: encodeURIComponent(token),
    register: kind === 'register',
    recover: kind === 'recover',
    update: kind === 'update',
  }
  const subject = {
    register: `[${ctfName}] Verify your email`,
    recover: `[${ctfName}] Recover your account`,
    update: `[${ctfName}] Update your email`,
  }[kind]

  await emailProvider.send({
    from: `${ctfName} <${config.email.from}>`,
    to: to,
    subject,
    html: mustache.render(emailHTML, emailView),
    text: mustache.render(emailTXT, emailView),
  })
}
