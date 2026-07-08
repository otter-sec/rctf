import { scoreProvider } from '@rctf/api/src/providers'
import type { ServerConfig } from '@rctf/config'
import type {
  Challenge,
  ScoreEvent,
  Settings,
  Solve,
  Submission,
  User,
  UserMember,
} from '@rctf/db'
import {
  ChallengeScoringKind,
  DynamicScoringTransport,
  ExposeKind,
  Permissions,
  SubmissionKind,
  SubmissionResult,
} from '@rctf/types'

export type SeedData = {
  admin: User
  teams: User[]
  users: User[]
  members: UserMember[]
  challenges: Challenge[]
  solves: Solve[]
  scoreEvents: ScoreEvent[]
  submissions: Submission[]
  settings: Settings
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
export const SEED_TEAM_COUNT = 250

export function resolveSeedTeamCount(): number {
  const raw = process.env.SEED_TEAM_COUNT
  if (raw === undefined || raw.trim() === '') {
    return SEED_TEAM_COUNT
  }

  const parsed = Number(raw.trim())
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `SEED_TEAM_COUNT must be a positive integer, got: ${JSON.stringify(raw)}`
    )
  }

  return parsed
}

const SEED_GENERATED_CHALLENGE_COUNT = 18
export const SEED_CHALLENGE_COUNT = SEED_GENERATED_CHALLENGE_COUNT + 4
export const COUNTRIES = ['EU', 'FR', 'US', 'CA', 'HK'] as const
export const STATUSES = ['hi', 'hello'] as const
export const SEED_CHALLENGE_CATEGORIES = [
  'rev',
  'pwn',
  'crypto',
  'web',
  'misc',
] as const

type SeedTiming = {
  startTime: number
  endTime: number
  solveEarliest: number
  solveSpan: number
}

const ADMIN_NAME = 'Admin'
const ADMIN_EMAIL = 'admin@seed.rctf.local'
const KOTH_1_CHALLENGE_ID = 'seed-koth-1'
const KOTH_2_CHALLENGE_ID = 'seed-koth-2'
const INSTANCER_CHALLENGE_ID = 'instancer-playground'
const ADMIN_BOT_CHALLENGE_ID = 'admin-bot-playground'
const KOTH_TICK_INTERVAL = 15 * 60_000
const KOTH_MAX_POINTS = 880
const KOTH_PAYOUT_EXPONENT = 1.1
const KOTH_SCORING_DEPTH = 0.55
const solveEndOffset = 5 * 60_000

const FAILED_FLAGS = [
  SubmissionResult.INCORRECT,
  SubmissionResult.ALREADY_SOLVED,
  SubmissionResult.INVALID_INPUT,
] as const
const BOT_RESULTS = [
  SubmissionResult.CORRECT,
  SubmissionResult.QUEUED,
  SubmissionResult.ACTIVE_JOB,
  SubmissionResult.BAD_INSTANCER_STATE,
  SubmissionResult.INVALID_INPUT,
] as const
const WRONG_FLAGS = [
  'rctf{nope}',
  'rctf{not_quite}',
  'flag{wrong}',
  'rctf{hello}',
  '',
] as const

const ADMIN_BOT_PLAYGROUND_CODE = `const { Challenge } = require('../types')

export const challenge = new Challenge({
  timeoutMilliseconds: 30000,
  inputs: {
    url: { pattern: '^https?://.+', flags: 'i' },
  },
  handler: async ctx => {
    const page = await ctx.browserContext.newPage()
    await page.setCookie({
      name: 'flag',
      value: ctx.job.flag,
      url: ctx.input.url,
    })
    ctx.output.info('admin-bot', 'visiting ' + ctx.input.url)
    await page.goto(ctx.input.url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(resolve => setTimeout(resolve, 5000))
    await page.close()
  },
  hooksConfig: {
    showConsoleLogs: false,
    showBrowserErrors: false,
    showNavigation: false,
    limitTabsNumber: -1,
  },
})
`

const randomInt = (max: number) => Math.floor(Math.random() * max)
const randomIp = () =>
  `10.${1 + randomInt(200)}.${1 + randomInt(200)}.${1 + randomInt(254)}`

const randomItem = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)]!

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const titleCase = (value: string) =>
  value.replace(/\b[a-z]/g, letter => letter.toUpperCase())

const isGeneratedFlagChallenge = (challenge: Challenge) =>
  challenge.data.scoring?.kind !== ChallengeScoringKind.DYNAMIC

const allPermissions = Object.values(Permissions)
  .filter((value): value is number => typeof value === 'number')
  .reduce((acc, value) => acc | value, 0)

function buildAdmin(): User {
  return {
    id: 'seed-admin',
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    division: 'open',
    perms: allPermissions,
    ctftimeId: null,
    createdAt: new Date(Date.now() - DAY).toISOString(),
    avatarUrl: null,
    countryCode: 'EU',
    statusText: 'admin status text',
    banned: false,
  }
}

function buildTeams(config: ServerConfig, count: number): User[] {
  const divisions = Object.keys(config.divisions)
  const usableDivisions = divisions.length > 0 ? divisions : ['open']

  return Array.from({ length: count }, (_, index) => {
    const number = index + 1
    const padded = String(number).padStart(3, '0')

    return {
      id: `seed-team-${padded}`,
      name: `Team ${padded}`,
      email: `team-${padded}@seed.rctf.local`,
      division: randomItem(usableDivisions),
      perms: 0,
      ctftimeId: null,
      createdAt: new Date(Date.now() - DAY + index * 60_000).toISOString(),
      avatarUrl: null,
      countryCode: randomItem(COUNTRIES),
      statusText: randomItem(STATUSES),
      banned: number % 20 === 0,
    }
  })
}

function buildMembers(config: ServerConfig, teams: User[]): UserMember[] {
  if (!config.userMembers) {
    return []
  }

  return teams.flatMap((team, teamIndex) => {
    const memberCount = Math.min(teamIndex % 4, config.maxMembers)
    return Array.from({ length: memberCount }, (_, memberIndex) => ({
      id: `${team.id}-member-${memberIndex + 1}`,
      userid: team.id,
      email: `${team.id}-member-${memberIndex + 1}@seed.rctf.local`,
    }))
  })
}

function buildChallenges(): Challenge[] {
  const categoryCounts = new Map<string, number>()

  const generatedChallenges = Array.from(
    { length: SEED_GENERATED_CHALLENGE_COUNT },
    (_, index) => {
      const category = randomItem(SEED_CHALLENGE_CATEGORIES)
      const categoryOrdinal = (categoryCounts.get(category) ?? 0) + 1
      categoryCounts.set(category, categoryOrdinal)

      const categorySlug = slug(category)
      const challengeOrdinal = index + 1
      const id = `seed-${categorySlug}-${categoryOrdinal}`
      const name = `${titleCase(category)} ${categoryOrdinal}`

      return {
        id,
        data: {
          name,
          description: `Generated ${category} challenge ${categoryOrdinal}.`,
          category,
          author: 'seed',
          files: [],
          points: {
            min: 50 + (index % 4) * 25,
            max: 500,
          },
          flag: `rctf{${id.replaceAll('-', '_')}}`,
          tiebreakEligible: true,
          sortWeight: challengeOrdinal * 10,
          hidden: false,
          releaseTime: null,
        },
      }
    }
  )

  return [
    ...generatedChallenges,
    {
      id: KOTH_1_CHALLENGE_ID,
      data: {
        name: 'Koth 1',
        description: 'Generated koth challenge 1.',
        category: 'koth',
        author: 'seed',
        files: [],
        points: {
          min: 0,
          max: 500,
        },
        flag: '',
        tiebreakEligible: true,
        sortWeight: (SEED_GENERATED_CHALLENGE_COUNT + 1) * 10,
        hidden: false,
        releaseTime: null,
        scoring: {
          kind: ChallengeScoringKind.DYNAMIC,
          source: {
            transport: DynamicScoringTransport.WEBHOOK,
            secret: 'seed-koth-webhook-secret',
          },
        },
      },
    },
    {
      id: KOTH_2_CHALLENGE_ID,
      data: {
        name: 'Koth 2',
        description: 'Generated koth challenge 2 with performance penalties.',
        category: 'koth',
        author: 'seed',
        files: [],
        points: {
          min: 0,
          max: 500,
        },
        flag: '',
        tiebreakEligible: true,
        sortWeight: (SEED_GENERATED_CHALLENGE_COUNT + 2) * 10,
        hidden: false,
        releaseTime: null,
        scoring: {
          kind: ChallengeScoringKind.DYNAMIC,
          source: {
            transport: DynamicScoringTransport.WEBHOOK,
            secret: 'seed-koth-2-webhook-secret',
          },
        },
      },
    },
    {
      id: INSTANCER_CHALLENGE_ID,
      data: {
        name: 'Instancer Playground',
        description:
          'On-demand instanced challenge for exercising the instancer panel.',
        category: 'web',
        author: 'seed',
        files: [],
        points: {
          min: 100,
          max: 500,
        },
        flag: 'rctf{instancer_playground}',
        tiebreakEligible: true,
        sortWeight: (SEED_GENERATED_CHALLENGE_COUNT + 3) * 10,
        hidden: false,
        releaseTime: Date.now() - DAY,
        instancerConfig: {
          challengeIntegrationId: INSTANCER_CHALLENGE_ID,
          instancer: 'docker',
          config: {
            services: {
              app: {
                image: 'traefik/whoami:latest',
                environment: { CHALLENGE: INSTANCER_CHALLENGE_ID },
              },
            },
          },
          expose: [
            {
              kind: ExposeKind.HTTP,
              hostPrefix: 'instancer-playground-web',
              containerName: 'app',
              containerPort: 80,
              shouldDisplay: true,
              title: 'Web',
            },
            {
              kind: ExposeKind.TCP,
              hostPrefix: 'instancer-playground-nc',
              containerName: 'app',
              containerPort: 1337,
              shouldDisplay: true,
              title: 'Netcat',
            },
          ],
          timeoutMilliseconds: 600_000,
          extendable: true,
        },
      },
    },
    {
      id: ADMIN_BOT_CHALLENGE_ID,
      data: {
        name: 'Admin Bot Playground',
        description:
          'Standalone admin-bot challenge for exercising the admin-bot panel.',
        category: 'web',
        author: 'seed',
        files: [],
        points: {
          min: 100,
          max: 500,
        },
        flag: 'rctf{admin_bot_playground}',
        tiebreakEligible: true,
        sortWeight: (SEED_GENERATED_CHALLENGE_COUNT + 4) * 10,
        hidden: false,
        releaseTime: Date.now() - DAY,
        adminBotConfig: {
          code: ADMIN_BOT_PLAYGROUND_CODE,
          inputs: {
            url: { pattern: '^https?://.+', flags: 'i' },
          },
          revision: '1',
          timeoutMilliseconds: 60_000,
          requireInstancerInstancesRunning: false,
        },
      },
    },
  ]
}

function buildSeedTiming(config: ServerConfig): SeedTiming {
  const now = Date.now()
  const solveLatest = Math.min(
    now - solveEndOffset,
    config.endTime - solveEndOffset
  )

  if (config.startTime > 0 && config.startTime < solveLatest) {
    const solveEarliest = Math.max(config.startTime, solveLatest - DAY)
    return {
      startTime: config.startTime,
      endTime: config.endTime,
      solveEarliest,
      solveSpan: Math.max(HOUR, solveLatest - solveEarliest),
    }
  }

  const startTime = solveLatest - DAY

  return {
    startTime,
    endTime: solveLatest + DAY,
    solveEarliest: startTime,
    solveSpan: DAY,
  }
}

function buildSolves(
  timing: SeedTiming,
  teams: User[],
  challenges: Challenge[]
): Solve[] {
  if (challenges.length === 0) {
    return []
  }

  const solves: Solve[] = []

  for (const [teamIndex, team] of teams.entries()) {
    const solvedCount = Math.max(
      1,
      Math.ceil(challenges.length * (1 - teamIndex / teams.length))
    )

    for (
      let challengeIndex = 0;
      challengeIndex < solvedCount;
      challengeIndex++
    ) {
      const challenge = challenges[challengeIndex]!
      const teamStrength = 1 - teamIndex / teams.length
      const earlyBias = 1 + teamStrength * 1.5
      const progress = Math.pow(Math.random(), earlyBias)
      const createdAt = new Date(
        timing.solveEarliest + Math.floor(timing.solveSpan * progress)
      ).toISOString()

      solves.push({
        id: `seed-solve-${team.id}-${challenge.id}`,
        challengeid: challenge.id,
        userid: team.id,
        createdat: createdAt,
        submissionip: `10.${(teamIndex % 200) + 1}.${(challengeIndex % 200) + 1}.1`,
      })
    }
  }

  return solves.sort((a, b) => a.createdat.localeCompare(b.createdat))
}

type KothScoreConfig = {
  challengeId: string
  allowPenalties?: boolean
}

type KothTickScoreContext = {
  allowPenalties: boolean
  basePoints: number
  priorPoints: number
  rank: number
  tickCount: number
  tickIndex: number
}

function calculateKothCurrentPoints(ctx: KothTickScoreContext): number {
  if (ctx.basePoints === 0) {
    return 0
  }

  const progress = (ctx.tickIndex + 1) / ctx.tickCount
  const expectedPoints = Math.round(ctx.basePoints * progress)
  const isPenaltyTick =
    ctx.tickIndex === ctx.tickCount - 1 || ctx.tickIndex % 4 === 2
  const shouldPenalize =
    ctx.allowPenalties &&
    ctx.tickIndex > 1 &&
    isPenaltyTick &&
    (ctx.rank + ctx.tickIndex) % 5 === 0 &&
    ctx.priorPoints > 0

  if (!shouldPenalize) {
    return Math.max(ctx.priorPoints, expectedPoints)
  }

  const penaltyPoints = Math.max(1, Math.round(ctx.basePoints * 0.08))
  return Math.max(0, ctx.priorPoints - penaltyPoints)
}

function buildKothScores(
  timing: SeedTiming,
  teams: User[],
  config: KothScoreConfig
): { solves: Solve[]; scoreEvents: ScoreEvent[] } {
  const eligibleTeams = teams.filter(team => !team.banned)
  if (eligibleTeams.length === 0) {
    return { solves: [], scoreEvents: [] }
  }

  const solveLatest = timing.solveEarliest + timing.solveSpan
  const tickStart = timing.startTime
  const tickSpan = Math.max(1, solveLatest - tickStart)
  const tickCount = Math.max(1, Math.floor(tickSpan / KOTH_TICK_INTERVAL))
  const zeroScoreRank = Math.max(
    1,
    Math.floor(eligibleTeams.length * KOTH_SCORING_DEPTH)
  )
  const zeroScoreWeight = Math.pow(zeroScoreRank + 1, -KOTH_PAYOUT_EXPONENT)
  const maxScoreWeight = 1 - zeroScoreWeight
  const rankedTeams = eligibleTeams.map((team, rank) => {
    const scoreWeight =
      Math.pow(rank + 1, -KOTH_PAYOUT_EXPONENT) - zeroScoreWeight

    return {
      rank,
      team,
      points: Math.max(
        0,
        Math.round((KOTH_MAX_POINTS * scoreWeight) / maxScoreWeight)
      ),
    }
  })
  const totals = new Map<string, number>()
  const firstAwardAt = new Map<string, string>()
  const lastAwardAt = new Map<string, string>()
  const scoreEvents: ScoreEvent[] = []

  for (let tickIndex = 0; tickIndex < tickCount; tickIndex++) {
    const eventAt = new Date(
      tickStart + Math.min(tickSpan, (tickIndex + 1) * KOTH_TICK_INTERVAL)
    ).toISOString()
    const tickNumber = String(tickIndex + 1).padStart(2, '0')

    for (const { rank, team, points } of rankedTeams) {
      const priorPoints = totals.get(team.id) ?? 0
      const currentPoints = calculateKothCurrentPoints({
        allowPenalties: config.allowPenalties ?? false,
        basePoints: points,
        priorPoints,
        rank,
        tickCount,
        tickIndex,
      })
      const pointsDelta = currentPoints - priorPoints
      if (pointsDelta === 0) {
        continue
      }

      totals.set(team.id, currentPoints)
      if (currentPoints > 0) {
        firstAwardAt.set(team.id, firstAwardAt.get(team.id) ?? eventAt)
      }
      lastAwardAt.set(team.id, eventAt)
      scoreEvents.push({
        id: `seed-score-${config.challengeId}-${tickNumber}-${team.id}`,
        challengeid: config.challengeId,
        userid: team.id,
        pointsDelta,
        eventAt,
        source: 'feed',
      })
    }
  }

  return {
    solves: Array.from(totals.entries())
      .filter(([, points]) => points > 0)
      .map(([userid, points]) => ({
        id: `seed-solve-${userid}-${config.challengeId}`,
        challengeid: config.challengeId,
        userid,
        createdat: firstAwardAt.get(userid)!,
        submissionip: null,
        points,
        pointsUpdatedAt: lastAwardAt.get(userid)!,
        source: 'feed' as const,
      }))
      .sort((a, b) => a.createdat.localeCompare(b.createdat)),
    scoreEvents,
  }
}

type FlagScoreState = {
  challenge: Challenge
  firstSolveTime: number | null
  solves: Solve[]
}

type FlagScoreEventContext = {
  currentPointsBySolve: Map<string, number>
  eventAt: string
  maxSolves: number
  nextEventIndex: number
  scoreEvents: ScoreEvent[]
  timing: SeedTiming
}

const scoreProviderRequiresMaxSolves = () =>
  scoreProvider.requiredFields.includes('maxSolves')

function calculateFlagScore(
  state: FlagScoreState,
  timing: SeedTiming,
  maxSolves: number
): number {
  return scoreProvider.calculate({
    minPoints: state.challenge.data.points.min,
    maxPoints: state.challenge.data.points.max,
    solves: state.solves.length,
    maxSolves,
    eventStartTime: timing.startTime,
    eventEndTime: timing.endTime,
    firstSolveTime: state.firstSolveTime,
  })
}

function applyFlagScoreState(
  state: FlagScoreState,
  ctx: FlagScoreEventContext
) {
  const newPoints = calculateFlagScore(state, ctx.timing, ctx.maxSolves)

  for (const solve of state.solves) {
    const priorPoints = ctx.currentPointsBySolve.get(solve.id) ?? 0
    const pointsDelta = newPoints - priorPoints
    if (pointsDelta === 0) {
      continue
    }

    solve.points = newPoints
    solve.pointsUpdatedAt = ctx.eventAt
    ctx.currentPointsBySolve.set(solve.id, newPoints)
    ctx.scoreEvents.push({
      id: `seed-score-flag-${String(ctx.nextEventIndex++).padStart(5, '0')}`,
      challengeid: solve.challengeid,
      userid: solve.userid,
      pointsDelta,
      eventAt: ctx.eventAt,
      source: 'flag',
    })
  }
}

function buildFlagScoreEvents(
  timing: SeedTiming,
  teams: User[],
  challenges: Challenge[],
  solves: Solve[]
): ScoreEvent[] {
  const activeTeamIds = new Set(
    teams.filter(team => !team.banned).map(team => team.id)
  )
  const statesByChallenge = new Map<string, FlagScoreState>(
    challenges.map(challenge => [
      challenge.id,
      { challenge, firstSolveTime: null, solves: [] },
    ])
  )
  const orderedSolves = solves
    .filter(
      solve =>
        activeTeamIds.has(solve.userid) &&
        statesByChallenge.has(solve.challengeid)
    )
    .sort(
      (a, b) =>
        a.createdat.localeCompare(b.createdat) || a.id.localeCompare(b.id)
    )

  const ctx: FlagScoreEventContext = {
    currentPointsBySolve: new Map(),
    eventAt: '',
    maxSolves: 0,
    nextEventIndex: 1,
    scoreEvents: [],
    timing,
  }
  const requiresMaxSolves = scoreProviderRequiresMaxSolves()

  for (const solve of orderedSolves) {
    const state = statesByChallenge.get(solve.challengeid)!
    state.solves.push(solve)
    state.firstSolveTime ??= new Date(solve.createdat).valueOf()

    const priorMaxSolves = ctx.maxSolves
    ctx.maxSolves = requiresMaxSolves
      ? Math.max(ctx.maxSolves, state.solves.length)
      : 0
    ctx.eventAt = solve.createdat

    if (requiresMaxSolves && ctx.maxSolves !== priorMaxSolves) {
      for (const nextState of statesByChallenge.values()) {
        if (nextState.solves.length > 0) {
          applyFlagScoreState(nextState, ctx)
        }
      }
    } else {
      applyFlagScoreState(state, ctx)
    }
  }

  return ctx.scoreEvents.sort((a, b) =>
    (a.eventAt ?? '').localeCompare(b.eventAt ?? '')
  )
}

function buildSubmissions(
  timing: SeedTiming,
  teams: User[],
  challenges: Challenge[],
  solves: Solve[]
): Submission[] {
  if (teams.length === 0 || challenges.length === 0) return []

  const randomTime = () =>
    new Date(timing.solveEarliest + randomInt(timing.solveSpan)).toISOString()
  const challengesById = new Map(challenges.map(c => [c.id, c]))

  let counter = 0
  const make = (
    extras: Partial<Submission> &
      Pick<Submission, 'kind' | 'challengeId' | 'userId' | 'result' | 'details'>
  ): Submission => ({
    id: `seed-sub-${String(++counter).padStart(6, '0')}`,
    ip: randomIp(),
    relatedId: null,
    createdAt: randomTime(),
    ...extras,
  })

  const submissions = solves.flatMap((solve): Submission[] => {
    const ch = challengesById.get(solve.challengeid)
    return ch
      ? [
          make({
            kind: SubmissionKind.FLAG,
            challengeId: solve.challengeid,
            userId: solve.userid,
            result: SubmissionResult.CORRECT,
            details: { submittedFlag: ch.data.flag },
            ip: solve.submissionip ?? 'unknown',
            createdAt: solve.createdat,
          }),
        ]
      : []
  })

  for (const [idx, team] of teams.entries()) {
    for (let n = 4 + (idx % 5); n-- > 0; ) {
      submissions.push(
        make({
          kind: SubmissionKind.FLAG,
          challengeId: randomItem(challenges).id,
          userId: team.id,
          result: randomItem(FAILED_FLAGS),
          details: { submittedFlag: randomItem(WRONG_FLAGS) },
        })
      )
    }
    for (let n = 2 + (idx % 3); n-- > 0; ) {
      const ch = randomItem(challenges)
      submissions.push(
        make({
          kind: SubmissionKind.ADMIN_BOT,
          challengeId: ch.id,
          userId: team.id,
          result: randomItem(BOT_RESULTS),
          details: {
            configRevision: `rev-${1 + (idx % 4)}`,
            inputs: { target: `https://${ch.id}.local/` },
          },
          relatedId: `seed-bot-${team.id}-${counter}`,
        })
      )
    }
  }

  return submissions.sort((a, b) => a.createdAt!.localeCompare(b.createdAt!))
}

function buildSettings(config: ServerConfig, timing: SeedTiming): Settings {
  const timingOverridden =
    timing.startTime !== config.startTime || timing.endTime !== config.endTime
  return {
    id: 'value-0',
    data: timingOverridden
      ? { startTime: timing.startTime, endTime: timing.endTime }
      : {},
  }
}

export function buildSeedData(config: ServerConfig): SeedData {
  const timing = buildSeedTiming(config)
  const admin = buildAdmin()
  const teams = buildTeams(config, resolveSeedTeamCount())
  const challenges = buildChallenges()
  const generatedFlagChallenges = challenges.filter(isGeneratedFlagChallenge)
  const flagSolves = buildSolves(timing, teams, generatedFlagChallenges)
  const kothScores = [
    buildKothScores(timing, teams, { challengeId: KOTH_1_CHALLENGE_ID }),
    buildKothScores(timing, teams, {
      allowPenalties: true,
      challengeId: KOTH_2_CHALLENGE_ID,
    }),
  ]
  const flagScoreEvents = buildFlagScoreEvents(
    timing,
    teams,
    generatedFlagChallenges,
    flagSolves
  )
  const solves = [
    ...flagSolves,
    ...kothScores.flatMap(koth => koth.solves),
  ].sort((a, b) => a.createdat.localeCompare(b.createdat))
  const scoreEvents = [
    ...flagScoreEvents,
    ...kothScores.flatMap(koth => koth.scoreEvents),
  ].sort((a, b) => (a.eventAt ?? '').localeCompare(b.eventAt ?? ''))

  return {
    admin,
    teams,
    users: [admin, ...teams],
    members: buildMembers(config, teams),
    challenges,
    solves,
    scoreEvents,
    submissions: buildSubmissions(
      timing,
      teams,
      generatedFlagChallenges,
      flagSolves
    ),
    settings: buildSettings(config, timing),
  }
}
