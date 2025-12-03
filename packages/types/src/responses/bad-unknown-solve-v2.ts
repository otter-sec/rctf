import { response } from '../internal'

export const BadUnknownSolveV2 = response('badUnknownSolve', {
  status: 404,
  message: 'The solve does not exist.',
})
