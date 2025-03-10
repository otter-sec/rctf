import { EventEmitter } from 'events'
import { Challenge } from './types'

export interface Provider extends EventEmitter {
  forceUpdate: () => void
  /*
    If the challenge doesn't exist already, create it.
    Otherwise, update the challenge data.

    Challenge equality is determined by chall.id.
  */
  updateChallenge: (
    chall: Pick<Challenge, 'id'> & Partial<Challenge>
  ) => Promise<void>
  deleteChallenge: (id: string) => Promise<void>
  cleanup: () => void
}

export type ProviderConstructor = new (options: unknown) => Provider
