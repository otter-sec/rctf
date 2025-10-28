import request from 'supertest'
import app from '../../src/app'
import * as util from '../_util'
import * as auth from '../../src/auth'
import config from '../../src/config/server'
import {
  badToken,
  badNotStarted,
  goodChallenges,
} from '@rctf/api-types/responses'
import Permissions from '../../src/util/perms'

let uuid, testUserData, adminUuid, testAdminUserData

beforeAll(async () => {
  await app.ready()
})

beforeAll(async () => {
  testUserData = await util.generateRealTestUser()
  uuid = testUserData.user.id

  testAdminUserData = await util.generateRealTestUser(Permissions.challsRead)
  adminUuid = testAdminUserData.user.id
})

afterAll(async () => {
  await testUserData.cleanup()
})

test('fails with unauthorized', async () => {
  const resp = await request(app.server)
    .get(process.env.API_ENDPOINT + '/challs')
    .expect(badToken.status)

  expect(resp.body.kind).toBe('badToken')
})

test('fails with badNotStarted', async () => {
  const oldTime = config.startTime
  // Choose a time 10 minutes in the future
  config.startTime = Date.now() + 10 * 60 * 1000

  const authToken = await auth.token.getToken(auth.token.tokenKinds.auth, uuid)
  const resp = await request(app.server)
    .get(process.env.API_ENDPOINT + '/challs')
    .set('Authorization', ' Bearer ' + authToken)
    .expect(badNotStarted.status)

  expect(resp.body.kind).toBe('badNotStarted')

  config.startTime = oldTime
})

test('succeeds with goodChallenges', async () => {
  const authToken = await auth.token.getToken(auth.token.tokenKinds.auth, uuid)
  const resp = await request(app.server)
    .get(process.env.API_ENDPOINT + '/challs')
    .set('Authorization', ' Bearer ' + authToken)
    .expect(goodChallenges.status)

  expect(resp.body.kind).toBe('goodChallenges')
  expect(Array.isArray(resp.body.data)).toBe(true)
})

test('succeds with goodChallenges for admin', async () => {
  const oldTime = config.startTime
  // Choose a time 10 minutes in the future
  config.startTime = Date.now() + 10 * 60 * 1000

  const authToken = await auth.token.getToken(
    auth.token.tokenKinds.auth,
    adminUuid
  )
  const resp = await request(app.server)
    .get(process.env.API_ENDPOINT + '/challs')
    .set('Authorization', ' Bearer ' + authToken)
    .expect(goodChallenges.status)

  expect(resp.body.kind).toBe('goodChallenges')

  config.startTime = oldTime
})
