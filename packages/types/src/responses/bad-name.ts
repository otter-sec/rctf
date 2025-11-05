import { response } from '../internal'

export const BadName = response('badName', {
  status: 400,
  message: 'The name should only use english letters, numbers, and symbols.',
})
