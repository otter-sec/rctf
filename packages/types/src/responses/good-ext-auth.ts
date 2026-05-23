import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodExtAuthClient = response('goodExtAuthClient', {
  status: 200,
  message: 'External-auth client lookup succeeded.',
  data: z.object({
    id: z.string(),
    name: z.string(),
    redirectUri: z.string(),
  }),
})

export const GoodExtAuthAuthorize = response('goodExtAuthAuthorize', {
  status: 200,
  message: 'Authorization issued. Redirect to the returned URL.',
  data: z.object({
    redirectTo: z.string(),
  }),
})

export const GoodExtAuthToken = response('goodExtAuthToken', {
  status: 200,
  message: 'Access token issued.',
  data: z.object({
    accessToken: z.string(),
    tokenType: z.literal('bearer'),
  }),
})

export const GoodAdminExtAuthClients = response('goodAdminExtAuthClients', {
  status: 200,
  message: 'External-auth clients listed.',
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      redirectUri: z.string(),
      createdAt: z.string(),
      createdBy: z.nullable(z.string()),
    })
  ),
})

export const GoodAdminExtAuthClientCreate = response(
  'goodAdminExtAuthClientCreate',
  {
    status: 200,
    message:
      'External-auth client created. Store the secret now - it cannot be retrieved later.',
    data: z.object({
      id: z.string(),
      name: z.string(),
      redirectUri: z.string(),
      createdAt: z.string(),
      createdBy: z.nullable(z.string()),
      secret: z.string(),
    }),
  }
)

export const GoodAdminExtAuthClientDelete = response(
  'goodAdminExtAuthClientDelete',
  {
    status: 200,
    message: 'External-auth client deleted.',
  }
)
