import { response } from '../internal'

export const BadModerationNotPassed = response('badModerationNotPassed', {
  status: 400,
  message: 'The content failed moderation.',
})
