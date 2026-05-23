import { response } from '../internal'

export const BadExtAuthRequest = response('badExtAuthRequest', {
  status: 400,
  message: 'External-auth request rejected.',
})
