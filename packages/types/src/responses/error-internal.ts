import { response } from '../internal'

export const ErrorInternal = response('errorInternal', {
  status: 500,
  message: 'An internal error occurred.',
})
