import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodExternalAuthClient = response('goodExternalAuthClient', {
  status: 200,
  message: 'External-auth client lookup succeeded.',
  data: z.object({
    id: example(z.string(), 'client-1a2b3c').check(
      z.describe('OAuth client ID.')
    ),
    name: example(z.string(), 'osec-dashboard').check(
      z.describe('Client display name.')
    ),
    redirectUri: example(z.string(), 'https://app.osec.io/callback').check(
      z.describe('Registered redirect URI.')
    ),
  }),
})

export const GoodExternalAuthAuthorize = response('goodExternalAuthAuthorize', {
  status: 200,
  message: 'Authorization issued. Redirect to the returned URL.',
  data: z.object({
    redirectTo: example(
      z.string(),
      'https://app.osec.io/callback?code=<code>'
    ).check(z.describe('URL to redirect the user agent to.')),
  }),
})

export const GoodExternalAuthToken = response('goodExternalAuthToken', {
  status: 200,
  message: 'Access token issued.',
  data: z.object({
    accessToken: example(z.string(), '<access-token>').check(
      z.describe('Issued OAuth access token.')
    ),
    tokenType: z
      .literal('bearer')
      .check(z.describe('Token type; always `bearer`.')),
  }),
})

export const GoodAdminExternalAuthClients = response(
  'goodAdminExternalAuthClients',
  {
    status: 200,
    message: 'External-auth clients listed.',
    data: z.array(
      z.object({
        id: example(z.string(), 'client-1a2b3c').check(
          z.describe('OAuth client ID.')
        ),
        name: example(z.string(), 'osec-dashboard').check(
          z.describe('Client display name.')
        ),
        redirectUri: example(z.string(), 'https://app.osec.io/callback').check(
          z.describe('Registered redirect URI.')
        ),
        createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
          z.describe('Creation time as an ISO 8601 timestamp.')
        ),
        createdBy: example(z.nullable(z.string()), 'admin-1a2b3c').check(
          z.describe('ID of the admin who created the client, or `null`.')
        ),
      })
    ),
  }
)

export const GoodAdminExternalAuthClientCreate = response(
  'goodAdminExternalAuthClientCreate',
  {
    status: 200,
    message:
      'External-auth client created. Store the secret now - it cannot be retrieved later.',
    data: z.object({
      id: example(z.string(), 'client-1a2b3c').check(
        z.describe('OAuth client ID.')
      ),
      name: example(z.string(), 'osec-dashboard').check(
        z.describe('Client display name.')
      ),
      redirectUri: example(z.string(), 'https://app.osec.io/callback').check(
        z.describe('Registered redirect URI.')
      ),
      createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
        z.describe('Creation time as an ISO 8601 timestamp.')
      ),
      createdBy: example(z.nullable(z.string()), 'admin-1a2b3c').check(
        z.describe('ID of the admin who created the client, or `null`.')
      ),
      secret: example(z.string(), '<client-secret>').check(
        z.describe('Client secret. Shown once - store it now.')
      ),
    }),
  }
)

export const GoodAdminExternalAuthClientDelete = response(
  'goodAdminExternalAuthClientDelete',
  {
    status: 200,
    message: 'External-auth client deleted.',
  }
)
