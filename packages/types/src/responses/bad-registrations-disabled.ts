import { response } from '../internal'

export const BadRegistrationsDisabled = response('badRegistrationsDisabled', {
  status: 400,
  message: 'The registrations are disabled.',
})
