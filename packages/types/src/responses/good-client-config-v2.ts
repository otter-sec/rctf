import { z } from 'zod/mini'
import { ProtectedAction } from '../enums'
import { response } from '../internal'
import { NumericString } from '../util'
import { example } from '../util/example'

export const GoodClientConfigV2 = response('goodClientConfigV2', {
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
        iconLight: example(
          z.string(),
          'https://rctf.osec.io/sponsors/osec-light.png'
        ).check(
          z.describe('Sponsor icon URL for light mode, or empty string.')
        ),
        iconDark: example(
          z.string(),
          'https://rctf.osec.io/sponsors/osec-dark.png'
        ).check(z.describe('Sponsor icon URL for dark mode, or empty string.')),
        description: example(z.string(), 'Security research.').check(
          z.describe('Sponsor description.')
        ),
        url: example(z.optional(z.string()), 'https://osec.io').check(
          z.describe('Sponsor link, when present.')
        ),
      })
    ),
    flagFormatPlaceholder: example(z.string(), 'rctf{...}').check(
      z.describe('Placeholder shown in the flag submission box.')
    ),
    analytics: z
      .nullable(
        z.object({
          provider: example(z.string(), 'plausible').check(
            z.describe('Analytics provider name.')
          ),
          publicOptions: example(z.record(z.string(), z.string()), {
            domain: 'rctf.osec.io',
          }).check(z.describe('Public, client-safe analytics options.')),
        })
      )
      .check(z.describe('Analytics config, or `null` when disabled.')),
    ctfName: example(z.string(), 'rCTF').check(z.describe('Name of the CTF.')),
    divisions: example(z.record(z.string(), z.string()), {
      open: 'Open',
    }).check(z.describe('Division keys mapped to display names.')),
    defaultDivision: example(z.nullish(z.string()), 'open').check(
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
    faviconUrl: example(
      z.nullable(z.string()),
      'https://rctf.osec.io/favicon.ico'
    ).check(z.describe('Favicon URL, or `null` when unset.')),
    logoLightUrl: example(
      z.nullable(z.string()),
      'https://rctf.osec.io/logo-light.png'
    ).check(z.describe('Light-theme logo URL, or `null` when unset.')),
    logoDarkUrl: example(
      z.nullable(z.string()),
      'https://rctf.osec.io/logo-dark.png'
    ).check(z.describe('Dark-theme logo URL, or `null` when unset.')),
    emailEnabled: example(z.boolean(), true).check(
      z.describe('Whether email-based auth is enabled.')
    ),
    registrationsEnabled: example(z.nullable(z.boolean()), true).check(
      z.describe('Whether registrations are open, or `null` when unset.')
    ),
    ctftime: z
      .nullable(
        z.object({
          clientId: example(NumericString, '123456').check(
            z.describe('CTFtime OAuth client ID.')
          ),
        })
      )
      .check(
        z.describe('CTFtime integration config, or `null` when disabled.')
      ),
    instancerEnabled: example(z.boolean(), true).check(
      z.describe('Whether the challenge instancer is enabled.')
    ),
    isArchived: example(z.boolean(), false).check(
      z.describe('Whether the CTF is archived (read-only).')
    ),
    captcha: z
      .nullable(
        z.object({
          provider: example(z.string(), 'hcaptcha').check(
            z.describe('Captcha provider name.')
          ),
          publicOptions: example(z.record(z.string(), z.string()), {
            siteKey: '<captcha-site-key>',
          }).check(z.describe('Public, client-safe captcha options.')),
          protectedEndpoints: example(
            z.record(z.enum(ProtectedAction), z.boolean()),
            {
              register: true,
              recover: true,
              setEmail: false,
              instancerStart: false,
              instancerExtend: false,
              avatarUpload: false,
              adminBotSubmit: false,
            }
          ).check(z.describe('Which actions require a captcha.')),
        })
      )
      .check(z.describe('Captcha config, or `null` when disabled.')),
  }),
})
