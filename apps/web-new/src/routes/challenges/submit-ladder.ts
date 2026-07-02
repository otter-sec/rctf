export type SubmitState = 'archived' | 'ended' | 'login' | 'solved' | 'form'

export interface SubmitLadderInput {
  isArchived: boolean
  endTime: number
  now: number
  isAuthenticated: boolean
  isSolved: boolean
}

/**
 * Resolves which rung of the flag-submission ladder to render.
 *
 * First match wins in ladder order: archived, ended, login, solved, form. The
 * ended check mirrors the old app's strict `now > endTime`, so the exact end
 * instant (now === endTime) is not yet ended.
 */
export function resolveSubmitState(input: SubmitLadderInput): SubmitState {
  if (input.isArchived) return 'archived'
  if (input.now > input.endTime) return 'ended'
  if (!input.isAuthenticated) return 'login'
  if (input.isSolved) return 'solved'
  return 'form'
}
