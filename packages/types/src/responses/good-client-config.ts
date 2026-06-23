import { z } from 'zod/mini'
import { response } from '../internal'
import { NumericString, omitWhenNull } from '../util'
import { example } from '../util/example'

export const GoodClientConfig = response('goodClientConfig', {
  status: 200,
  message: 'The client config was retrieved.',
  data: z.object({
    meta: z.object({
      description: example(z.string(), 'A jeopardy-style CTF.').check(
        z.describe('Meta description used for link previews.')
      ),
      imageUrl: example(z.string(), 'https://rctf.osec.io/preview.png').check(
        z.describe('Preview image URL.')
      ),
    }),
    homeContent: example(z.string(), '# Welcome').check(
      z.describe('Markdown content shown on the home page.')
    ),
    sponsors: z.array(
      z.object({
        name: example(z.string(), 'osec').check(z.describe('Sponsor name.')),
        icon: example(
          z.string(),
          'https://rctf.osec.io/sponsors/osec.png'
        ).check(z.describe('Sponsor icon URL.')),
        description: example(z.string(), 'Security research.').check(
          z.describe('Sponsor description.')
        ),
        url: example(z.optional(z.string()), 'https://osec.io').check(
          z.describe('Sponsor link, when present.')
        ),
      })
    ),
    globalSiteTag: omitWhenNull(z.string()).check(
      z.describe('Analytics global site tag, or `null` when unset.')
    ),
    ctfName: example(z.string(), 'rCTF').check(z.describe('Name of the CTF.')),
    divisions: example(z.record(z.string(), z.string()), {
      open: 'Open',
    }).check(z.describe('Division keys mapped to display names.')),
    defaultDivision: omitWhenNull(z.string()).check(
      z.describe('Division selected by default, or `null` when unset.')
    ),
    origin: example(z.string(), 'https://rctf.osec.io').check(
      z.describe('Canonical origin of the deployment.')
    ),
    startTime: example(z.int(), 1710000000000).check(
      z.describe('CTF start time as a Unix timestamp in milliseconds.')
    ),
    endTime: example(z.int(), 1710864000000).check(
      z.describe('CTF end time as a Unix timestamp in milliseconds.')
    ),
    userMembers: example(z.boolean(), true).check(
      z.describe('Whether teams may add individual members.')
    ),
    faviconUrl: omitWhenNull(z.string()).check(
      z.describe('Favicon URL, or `null` when unset.')
    ),
    emailEnabled: example(z.boolean(), true).check(
      z.describe('Whether email-based auth is enabled.')
    ),
    registrationsEnabled: omitWhenNull(z.boolean()).check(
      z.describe('Whether registrations are open, or `null` when unset.')
    ),
    ctftime: omitWhenNull(
      z.object({
        clientId: example(NumericString, '123456').check(
          z.describe('CTFtime OAuth client ID.')
        ),
      })
    ).check(z.describe('CTFtime integration config, or `null` when disabled.')),
    recaptcha: omitWhenNull(
      z.object({
        siteKey: example(z.string(), '<recaptcha-site-key>').check(
          z.describe('reCAPTCHA public site key.')
        ),
        protectedActions: example(z.array(z.string()), ['register']).check(
          z.describe('Actions guarded by captcha.')
        ),
      })
    ).check(z.describe('reCAPTCHA config, or `null` when disabled.')),
  }),
})
