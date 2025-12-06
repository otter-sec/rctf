import { ClientConfig } from './types'
import server from './server'

const config: ClientConfig = {
  meta: server.meta,
  homeContent: server.homeContent,
  sponsors: server.sponsors,
  globalSiteTag: server.globalSiteTag,
  ctfName: server.ctfName,
  divisions: server.divisions,
  defaultDivision: server.defaultDivision,
  origin: server.origin,
  startTime: server.startTime,
  endTime: server.endTime,
  faviconUrl: server.faviconUrl,
  emailEnabled: server.email != null,
  userMembers: server.userMembers,
  registrationsEnabled: server.registrationsEnabled,
  ctftime:
    server.ctftime == null
      ? undefined
      : {
          clientId: server.ctftime.clientId,
        },
  recaptcha:
    server.recaptcha == null
      ? undefined
      : {
          siteKey: server.recaptcha.siteKey,
          protectedActions: server.recaptcha.protectedActions,
        },
}

export default config
