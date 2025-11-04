import { response } from '../dsl'

export const BadZeroAuth = response('badZeroAuth', {
  status: 409,
  message: 'At least one authentication method is required.',
})
