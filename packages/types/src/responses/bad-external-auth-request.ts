import { response } from '../internal'

export const BadExternalAuthRequest = response('badExternalAuthRequest', {
  status: 400,
  message: 'External-auth request rejected.',
})
