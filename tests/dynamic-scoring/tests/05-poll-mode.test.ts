import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import {
  awaitLeaderboard,
  cleanupChallenge,
  cleanupUser,
  clearMockScores,
  createDynamicChallenge,
  makeAdmin,
  MOCK_INTERNAL_URL,
  registerUser,
  setMockScores,
  stageMockFailure,
  testId,
  type TestUser,
} from '../lib/harness'

const POLL_INTERVAL_S = 5
const POLL_WAIT_MS = 12_000

describe('poll mode', () => {
  let admin: TestUser
  let alice: TestUser
  let bob: TestUser
  let challengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    alice = await registerUser(testId('alice'))
    bob = await registerUser(testId('bob'))
    challengeId = testId('chall-poll')
    await createDynamicChallenge(admin, challengeId, {
      transport: 'poll',
      url: `${MOCK_INTERNAL_URL}/scores/${challengeId}`,
      pollIntervalSeconds: POLL_INTERVAL_S,
      secret: 'poll-not-used',
    })
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(alice)
    await cleanupUser(bob)
    await cleanupUser(admin)
  })

  beforeEach(async () => {
    await clearMockScores()
  })

  test('worker picks up staged scores', async () => {
    await setMockScores(challengeId, {
      scores: [
        { userId: alice.id, points: 333 },
        { userId: bob.id, points: 111 },
      ],
      mode: 'replacement',
    })

    await awaitLeaderboard(
      e =>
        e.find(x => x.id === alice.id)?.score === 333 &&
        e.find(x => x.id === bob.id)?.score === 111,
      POLL_WAIT_MS
    )
  })

  test('changes propagate on subsequent polls', async () => {
    await setMockScores(challengeId, {
      scores: [{ userId: alice.id, points: 10 }],
      mode: 'replacement',
    })
    await awaitLeaderboard(
      e => e.find(x => x.id === alice.id)?.score === 10,
      POLL_WAIT_MS
    )

    await setMockScores(challengeId, {
      scores: [{ userId: alice.id, points: 777 }],
      mode: 'replacement',
    })
    await awaitLeaderboard(
      e => e.find(x => x.id === alice.id)?.score === 777,
      POLL_WAIT_MS
    )
  })

  test('5xx response triggers backoff (no crash)', async () => {
    await stageMockFailure(challengeId, 503)
    await Bun.sleep(POLL_INTERVAL_S * 1000 + 1000)

    await setMockScores(challengeId, {
      scores: [{ userId: alice.id, points: 12 }],
      mode: 'replacement',
    })
    await awaitLeaderboard(
      e => e.find(x => x.id === alice.id)?.score === 12,
      POLL_WAIT_MS * 3
    )
  })
})
