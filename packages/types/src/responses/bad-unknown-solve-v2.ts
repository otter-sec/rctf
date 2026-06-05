import { response } from '../internal'

export const BadUnknownSolveV2 = response('badUnknownSolveV2', {
  status: 404,
  message: 'The solve does not exist.',
})
