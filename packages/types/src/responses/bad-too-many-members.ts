import { response } from '../internal'

export const BadTooManyMembers = response('badTooManyMembers', {
  status: 409,
  message: 'You have reached the maximum number of team members.',
})
