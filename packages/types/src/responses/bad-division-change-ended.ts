import { response } from '../internal'

export const BadDivisionChangeEnded = response('badDivisionChangeEnded', {
  status: 403,
  message:
    'You are not allowed to change your division after the CTF has ended.',
})
