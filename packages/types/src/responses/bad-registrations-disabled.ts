import { response } from '../dsl'

export const BadRegistrationsDisabled = response('badRegistrationsDisabled', {
  status: 400,
  message: 'The registrations are disabled.',
})
