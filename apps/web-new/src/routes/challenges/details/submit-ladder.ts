export type SubmitState = 'archived' | 'ended' | 'login' | 'solved' | 'form'

export interface SubmitLadderInput {
  isArchived: boolean
  endTime: number
  now: number
  isAuthenticated: boolean
  isSolved: boolean
}

export function resolveSubmitState(input: SubmitLadderInput): SubmitState {
  if (input.isArchived) return 'archived'
  if (input.now > input.endTime) return 'ended'
  if (!input.isAuthenticated) return 'login'
  if (input.isSolved) return 'solved'
  return 'form'
}
