import { response } from '../internal'

export const BadDivisionNotAllowed = response('badDivisionNotAllowed', {
  status: 403,
  message: 'You are not allowed to join this division.',
})
