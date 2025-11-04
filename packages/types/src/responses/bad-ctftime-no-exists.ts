import { response } from '../dsl'

export const BadCtftimeNoExists = response('badCtftimeNoExists', {
  status: 404,
  message: 'There is no CTFtime team associated with the user.',
})
