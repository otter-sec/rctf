import { response } from '../dsl'

export const BadDivisionNotAllowed = response('badDivisionNotAllowed', {
  status: 403,
  message: 'You are not allowed to join this division.',
})
