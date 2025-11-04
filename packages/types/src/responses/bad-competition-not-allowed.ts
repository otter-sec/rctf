import { response } from '../dsl'

export const BadCompetitionNotAllowed = response('badCompetitionNotAllowed', {
  status: 403,
  message: 'You are not allowed to join this CTF.',
})
