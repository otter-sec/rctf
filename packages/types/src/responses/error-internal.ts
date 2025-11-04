import { response } from '../dsl'

export const ErrorInternal = response('errorInternal', {
  status: 500,
  message: 'An internal error occurred.',
})
