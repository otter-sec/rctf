import { z } from 'zod/mini'
import { response } from '../internal'
import { SponsorSchemaV2 } from '../util'
import { example } from '../util/example'

export const AdminSettingsSchema = z.object({
  ctfName: example(z.optional(z.string()), 'rCTF').check(
    z.describe('Name of the CTF.')
  ),
  homeContent: example(z.optional(z.string()), '# Welcome').check(
    z.describe('Markdown content shown on the home page.')
  ),
  startTime: example(z.optional(z.int()), 1710000000000).check(
    z.describe('CTF start time as a Unix timestamp in milliseconds.')
  ),
  endTime: example(z.optional(z.int()), 1710864000000).check(
    z.describe('CTF end time as a Unix timestamp in milliseconds.')
  ),
  sponsors: z.optional(z.array(SponsorSchemaV2)),
  meta: z.optional(
    z.object({
      description: example(
        z.optional(z.string()),
        'A jeopardy-style CTF.'
      ).check(z.describe('Meta description used for link previews.')),
      imageUrl: example(
        z.optional(z.string()),
        'https://rctf.osec.io/preview.png'
      ).check(z.describe('Preview image URL.')),
    })
  ),
  faviconUrl: example(
    z.optional(z.string()),
    'https://rctf.osec.io/favicon.ico'
  ).check(z.describe('Favicon URL.')),
  logoLightUrl: example(
    z.optional(z.string()),
    'https://rctf.osec.io/logo-light.png'
  ).check(z.describe('Light-theme logo URL.')),
  logoDarkUrl: example(
    z.optional(z.string()),
    'https://rctf.osec.io/logo-dark.png'
  ).check(z.describe('Dark-theme logo URL.')),
})

const AdminSettingsResponseData = z.object({
  overrides: AdminSettingsSchema.check(
    z.describe('Operator-set values overriding the defaults.')
  ),
  defaults: AdminSettingsSchema.check(z.describe('Built-in default values.')),
})

export const GoodAdminSettings = response('goodAdminSettings', {
  status: 200,
  message: 'The retrieval of settings was successful.',
  data: AdminSettingsResponseData,
})
