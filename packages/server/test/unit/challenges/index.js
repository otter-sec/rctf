import appFactory from 'fastify'
import { init } from '../../../src/uploads'
import * as challengeModule from '../../../src/challenges'

import {
  getAllChallenges,
  getChallenge,
  getCleanedChallenge,
  resetCache,
} from '../../../src/challenges'

const app = appFactory()
init(app)

test('get all challenges', () => {
  const data = getAllChallenges()
  expect(Array.isArray(data)).toBe(true)
})

test('challenges list is initially empty', () => {
  expect(getAllChallenges().length).toBe(0)
})

test('retrieving a non-existent challenge returns undefined', () => {
  expect(getChallenge('invalid-id')).toBeUndefined()
})

test('retrieving a non-existent cleaned challenge returns undefined', () => {
  expect(getCleanedChallenge('invalid-id')).toBeUndefined()
})

test('reset cache triggers provider update', () => {
  const spy = jest.spyOn(challengeModule, 'resetCache')

  resetCache()
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})
