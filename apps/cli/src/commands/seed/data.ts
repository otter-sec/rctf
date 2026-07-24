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
  ALL_PERMISSIONS,
  ChallengeScoringKind,
  DynamicScoringTransport,
  ExposeKind,
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

const DAY = 24 * 60 * 60 * 1000
const SOLVE_END_OFFSET = 5 * 60_000

const TEAM_COUNT = 1000
const FLAG_CHALLENGE_COUNT = 38

const resolveTeamCount = (): number => {
  const raw = Bun.env.SEED_TEAM_COUNT
  if (raw === undefined || raw.trim() === '') {
    return TEAM_COUNT
  }

  const parsed = Number(raw.trim())
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `SEED_TEAM_COUNT must be a positive integer, got: ${JSON.stringify(raw)}`
    )
  }

  return parsed
}

const SOLVE_COUNT_EXPONENT = 2.2
const TOP_SOLVE_RATIO = 0.85
const CHALLENGE_PICK_DECAY = 0.65
const CHALLENGE_POPULARITY_JITTER = 4

const COUNTRY_CODES = [
  'CA', // Canada
  'FR', // France
  'DE', // Germany
  'IT', // Italy
  'JP', // Japan
  'GB', // United Kingdom
  'US', // United States
  'EU', // European Union
] as const

const CATEGORIES = [
  'sanity',
  'pwn',
  'reverse',
  'crypto',
  'forensics',
  'blockchain',
  'web',
  'misc',
  'ppc',
  'osint',
] as const
const STATUSES = ['hi', 'hello', 'rctf v2 yay', 'yippee'] as const

const KOTH_CHALLENGES = [
  { id: 'seed-koth-1', penalties: false },
  { id: 'seed-koth-2', penalties: true },
] as const
const AD_CHALLENGES = [
  { id: 'seed-ad-1', penalties: false },
  { id: 'seed-ad-2', penalties: true },
] as const
const INSTANCER_CHALLENGE_ID = 'instancer-playground'
const ADMIN_BOT_CHALLENGE_ID = 'admin-bot-playground'
const KOTH_TICK_INTERVAL = 15 * 60_000
const KOTH_MAX_POINTS = 880
const KOTH_PAYOUT_EXPONENT = 1.1
const KOTH_SCORING_DEPTH = 0.55

const FAILED_FLAG_RESULTS = [
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
const randomItem = <T>(items: readonly T[]): T =>
  items[randomInt(items.length)]!
const shuffle = <T>(items: readonly T[]): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
const randomIp = () =>
  `10.${1 + randomInt(200)}.${1 + randomInt(200)}.${1 + randomInt(254)}`
const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1)

type SeedTiming = {
  startTime: number
  endTime: number
}

function buildTiming(): SeedTiming {
  const solveLatest = Date.now() - SOLVE_END_OFFSET
  return { startTime: solveLatest - DAY, endTime: solveLatest + DAY }
}

function buildAdmin(): User {
  return {
    id: 'seed-admin',
    name: 'Admin',
    email: 'admin@seed.rctf.local',
    division: 'open',
    perms: ALL_PERMISSIONS,
    ctftimeId: null,
    createdAt: new Date(Date.now() - DAY).toISOString(),
    avatarUrl: null,
    countryCode: 'EU',
    statusText: 'admin status text',
    banned: false,
  }
}

function buildTeams(config: ServerConfig): User[] {
  const divisions = Object.keys(config.divisions)
  if (divisions.length === 0) {
    divisions.push('open')
  }

  return Array.from({ length: resolveTeamCount() }, (_, index) => {
    const padded = String(index + 1).padStart(3, '0')

    return {
      id: `seed-team-${padded}`,
      name: `Team ${padded}`,
      email: `team-${padded}@seed.rctf.local`,
      division: randomItem(divisions),
      perms: 0,
      ctftimeId: null,
      createdAt: new Date(Date.now() - DAY + index * 60_000).toISOString(),
      avatarUrl: null,
      countryCode: randomItem(COUNTRY_CODES),
      statusText: randomItem(STATUSES),
      banned: (index + 1) % 20 === 0,
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

const makeChallenge = (
  id: string,
  slot: number,
  data: Partial<Challenge['data']>
): Challenge => ({
  id,
  data: {
    name: id,
    description: '',
    category: '',
    author: 'seed',
    files: [],
    points: { min: 0, max: 500 },
    flags: [],
    tiebreakEligible: true,
    sortWeight: (slot + 1) * 10,
    hidden: false,
    releaseTime: null,
    ...data,
  },
})

const buildChallenges = (): Challenge[] => {
  const categoryCounts = new Map<string, number>()
  const categories = shuffle(CATEGORIES)

  const flags = Array.from({ length: FLAG_CHALLENGE_COUNT }, (_, index) => {
    const category = categories[index] ?? randomItem(CATEGORIES)
    const ordinal = (categoryCounts.get(category) ?? 0) + 1
    categoryCounts.set(category, ordinal)
    const id = `seed-${category}-${ordinal}`

    return makeChallenge(id, index, {
      name: `${capitalize(category)} ${ordinal}`,
      description: `Generated ${category} challenge ${ordinal}.`,
      category,
      points: { min: 50 + (index % 4) * 25, max: 500 },
      flags: [
        {
          provider: 'flags/static',
          config: { flag: `rctf{${id.replaceAll('-', '_')}}` },
        },
        ...(index === 0
          ? [
              {
                provider: 'flags/static',
                config: { flag: `rctf{${id.replaceAll('-', '_')}_alt}` },
              },
            ]
          : []),
      ],
    })
  })

  const koths = KOTH_CHALLENGES.map((koth, index) =>
    makeChallenge(koth.id, FLAG_CHALLENGE_COUNT + index, {
      name: `Koth ${index + 1}`,
      description: `Generated koth challenge ${index + 1}${
        koth.penalties ? ' with performance penalties' : ''
      }.`,
      category: 'koth',
      scoring: {
        kind: ChallengeScoringKind.DYNAMIC,
        source: {
          transport: DynamicScoringTransport.WEBHOOK,
          secret: `${koth.id}-webhook-secret`,
        },
      },
    })
  )

  const ads = AD_CHALLENGES.map((ad, index) =>
    makeChallenge(
      ad.id,
      FLAG_CHALLENGE_COUNT + KOTH_CHALLENGES.length + 2 + index,
      {
        name: `Ad ${index + 1}`,
        description: `Generated attack/defense challenge ${index + 1}${
          ad.penalties ? ' with performance penalties' : ''
        }.`,
        category: 'ad',
        scoring: {
          kind: ChallengeScoringKind.DYNAMIC,
          source: {
            transport: DynamicScoringTransport.WEBHOOK,
            secret: `${ad.id}-webhook-secret`,
          },
        },
      }
    )
  )

  const playgrounds = [
    makeChallenge(
      INSTANCER_CHALLENGE_ID,
      FLAG_CHALLENGE_COUNT + KOTH_CHALLENGES.length,
      {
        name: 'Instancer Playground',
        description:
          'On-demand instanced challenge for exercising the instancer panel.',
        category: 'web',
        points: { min: 100, max: 500 },
        flags: [
          {
            provider: 'flags/static',
            config: { flag: 'rctf{instancer_playground}' },
          },
        ],
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
      }
    ),
    makeChallenge(
      ADMIN_BOT_CHALLENGE_ID,
      FLAG_CHALLENGE_COUNT + KOTH_CHALLENGES.length + 1,
      {
        name: 'Admin Bot Playground',
        description:
          'Standalone admin-bot challenge for exercising the admin-bot panel.',
        category: 'web',
        points: { min: 100, max: 500 },
        flags: [
          {
            provider: 'flags/static',
            config: { flag: 'rctf{admin_bot_playground}' },
          },
        ],
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
      }
    ),
  ]

  return [...flags, ...koths, ...ads, ...playgrounds]
}

const pickChallengeIndices = (weights: readonly number[], count: number) =>
  weights
    .map((weight, index) => ({ index, key: -Math.log(Math.random()) / weight }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map(entry => entry.index)

const buildFlagSolves = (
  timing: SeedTiming,
  teams: User[],
  challenges: Challenge[]
): Solve[] => {
  const solves: Solve[] = []
  // easy challenges attract more teams
  const pickWeights = challenges.map(
    (_, index) =>
      Math.pow(CHALLENGE_PICK_DECAY, index) *
      Math.pow(CHALLENGE_POPULARITY_JITTER, Math.random() * 2 - 1)
  )

  for (const [teamIndex, team] of teams.entries()) {
    // earlier teams are stronger
    const strength = 1 - teamIndex / teams.length
    const solvedCount = Math.min(
      challenges.length,
      Math.max(
        1,
        Math.round(
          challenges.length *
            TOP_SOLVE_RATIO *
            Math.pow(strength, SOLVE_COUNT_EXPONENT) +
            Math.random() -
            0.5
        )
      )
    )

    for (const index of pickChallengeIndices(pickWeights, solvedCount)) {
      const challenge = challenges[index]!
      const difficulty = index / (challenges.length - 1)
      const exponent = 0.35 + Math.pow(1 - difficulty, 2) * (2 + strength * 2)
      const progress = Math.pow(Math.random(), exponent)

      solves.push({
        id: `seed-solve-${team.id}-${challenge.id}`,
        challengeid: challenge.id,
        userid: team.id,
        createdat: new Date(
          timing.startTime + Math.floor(DAY * progress)
        ).toISOString(),
        submissionip: `10.${(teamIndex % 200) + 1}.${(index % 200) + 1}.1`,
      })
    }
  }

  return solves
}

type ChallengeScoreState = {
  challenge: Challenge
  firstSolveTime: number | null
  solves: Solve[]
}

const buildFlagScoreEvents = (
  timing: SeedTiming,
  teams: User[],
  challenges: Challenge[],
  solves: Solve[]
): ScoreEvent[] => {
  const bannedIds = new Set(
    teams.filter(team => team.banned).map(team => team.id)
  )
  const states = new Map<string, ChallengeScoreState>(
    challenges.map(challenge => [
      challenge.id,
      { challenge, firstSolveTime: null, solves: [] },
    ])
  )
  const trackMaxSolves = scoreProvider.requiredFields.includes('maxSolves')
  const events: ScoreEvent[] = []
  let maxSolves = 0

  const rescore = (state: ChallengeScoreState, eventAt: string) => {
    const points = scoreProvider.calculate({
      minPoints: state.challenge.data.points.min,
      maxPoints: state.challenge.data.points.max,
      solves: state.solves.length,
      maxSolves,
      eventStartTime: timing.startTime,
      eventEndTime: timing.endTime,
      firstSolveTime: state.firstSolveTime,
    })

    for (const solve of state.solves) {
      const pointsDelta = points - (solve.points ?? 0)
      if (pointsDelta === 0) {
        continue
      }

      solve.points = points
      solve.pointsUpdatedAt = eventAt
      events.push({
        id: `seed-score-flag-${String(events.length + 1).padStart(5, '0')}`,
        challengeid: state.challenge.id,
        userid: solve.userid,
        pointsDelta,
        eventAt,
        source: 'flag',
      })
    }
  }

  const ordered = solves
    .filter(solve => !bannedIds.has(solve.userid))
    .sort(
      (a, b) =>
        a.createdat.localeCompare(b.createdat) || a.id.localeCompare(b.id)
    )

  for (const solve of ordered) {
    const state = states.get(solve.challengeid)!
    state.solves.push(solve)
    state.firstSolveTime ??= Date.parse(solve.createdat)

    if (trackMaxSolves && state.solves.length > maxSolves) {
      maxSolves = state.solves.length
      for (const other of states.values()) {
        if (other.solves.length > 0) {
          rescore(other, solve.createdat)
        }
      }
    } else {
      rescore(state, solve.createdat)
    }
  }

  return events
}

const buildKothScores = (
  timing: SeedTiming,
  teams: User[],
  challengeId: string,
  penalties: boolean
): { solves: Solve[]; scoreEvents: ScoreEvent[] } => {
  const eligible = teams.filter(team => !team.banned)
  const tickCount = Math.floor(DAY / KOTH_TICK_INTERVAL)

  // rank 0 earns the most, ranks past the cutoff earn 0
  const zeroWeight = Math.pow(
    Math.max(1, Math.floor(eligible.length * KOTH_SCORING_DEPTH)) + 1,
    -KOTH_PAYOUT_EXPONENT
  )
  const payouts = eligible.map((_, rank) =>
    Math.max(
      0,
      Math.round(
        (KOTH_MAX_POINTS *
          (Math.pow(rank + 1, -KOTH_PAYOUT_EXPONENT) - zeroWeight)) /
          (1 - zeroWeight)
      )
    )
  )

  const solveByTeam = new Map<string, Solve>()
  const scoreEvents: ScoreEvent[] = []

  for (let tick = 0; tick < tickCount; tick++) {
    const eventAt = new Date(
      timing.startTime + (tick + 1) * KOTH_TICK_INTERVAL
    ).toISOString()

    for (const [rank, team] of eligible.entries()) {
      const payout = payouts[rank]!
      const solve = solveByTeam.get(team.id) ?? {
        id: `seed-solve-${team.id}-${challengeId}`,
        challengeid: challengeId,
        userid: team.id,
        createdat: eventAt,
        submissionip: null,
        points: 0,
        pointsUpdatedAt: eventAt,
        source: 'feed' as const,
      }
      const prior = solve.points ?? 0
      const penalized =
        penalties &&
        tick > 1 &&
        prior > 0 &&
        (tick === tickCount - 1 || tick % 4 === 2) &&
        (rank + tick) % 5 === 0
      const current = penalized
        ? Math.max(0, prior - Math.max(1, Math.round(payout * 0.08)))
        : Math.max(prior, Math.round((payout * (tick + 1)) / tickCount))

      if (current === prior) {
        continue
      }

      solve.points = current
      solve.pointsUpdatedAt = eventAt
      solveByTeam.set(team.id, solve)
      scoreEvents.push({
        id: `seed-score-${challengeId}-${String(tick + 1).padStart(2, '0')}-${team.id}`,
        challengeid: challengeId,
        userid: team.id,
        pointsDelta: current - prior,
        eventAt,
        source: 'feed',
      })
    }
  }

  return {
    solves: [...solveByTeam.values()].filter(solve => (solve.points ?? 0) > 0),
    scoreEvents,
  }
}

const buildSubmissions = (
  timing: SeedTiming,
  teams: User[],
  challenges: Challenge[],
  solves: Solve[]
): Submission[] => {
  const flagsById = new Map(
    challenges.map(c => [
      c.id,
      (c.data.flags[0]?.config as { flag?: string } | undefined)?.flag ?? '',
    ])
  )
  let counter = 0
  const base = () => ({
    id: `seed-sub-${String(++counter).padStart(6, '0')}`,
    ip: randomIp(),
    relatedId: null,
    createdAt: new Date(timing.startTime + randomInt(DAY)).toISOString(),
  })

  const submissions: Submission[] = solves.map(solve => ({
    ...base(),
    kind: SubmissionKind.FLAG,
    challengeId: solve.challengeid,
    userId: solve.userid,
    result: SubmissionResult.CORRECT,
    details: { submittedFlag: flagsById.get(solve.challengeid)! },
    ip: solve.submissionip ?? 'unknown',
    createdAt: solve.createdat,
  }))

  for (const [index, team] of teams.entries()) {
    for (let n = 0; n < 4 + (index % 5); n++) {
      submissions.push({
        ...base(),
        kind: SubmissionKind.FLAG,
        challengeId: randomItem(challenges).id,
        userId: team.id,
        result: randomItem(FAILED_FLAG_RESULTS),
        details: { submittedFlag: randomItem(WRONG_FLAGS) },
      })
    }

    for (let n = 0; n < 2 + (index % 3); n++) {
      const challenge = randomItem(challenges)
      submissions.push({
        ...base(),
        kind: SubmissionKind.ADMIN_BOT,
        challengeId: challenge.id,
        userId: team.id,
        result: randomItem(BOT_RESULTS),
        details: {
          configRevision: `rev-${1 + (index % 4)}`,
          inputs: { target: `https://${challenge.id}.local/` },
        },
        relatedId: `seed-bot-${team.id}-${counter}`,
      })
    }
  }

  return submissions
}

const buildSettings = (config: ServerConfig, timing: SeedTiming): Settings => {
  return {
    id: 'value-0',
    data: {
      ctfName: config.ctfName,
      homeContent: config.homeContent,
      startTime: timing.startTime,
      endTime: timing.endTime,
      sponsors: config.sponsors,
      meta: config.meta,
      faviconUrl: config.faviconUrl,
      logoLightUrl: config.logoLightUrl,
      logoDarkUrl: config.logoDarkUrl,
    },
  }
}

export const buildSeedData = (config: ServerConfig): SeedData => {
  const timing = buildTiming()
  const admin = buildAdmin()
  const teams = buildTeams(config)
  const challenges = buildChallenges()
  const flagChallenges = challenges.slice(0, FLAG_CHALLENGE_COUNT)
  const solves = buildFlagSolves(timing, teams, flagChallenges)
  const scoreEvents = buildFlagScoreEvents(
    timing,
    teams,
    flagChallenges,
    solves
  )
  const submissions = buildSubmissions(timing, teams, flagChallenges, solves)

  for (const dynamic of [...KOTH_CHALLENGES, ...AD_CHALLENGES]) {
    const scores = buildKothScores(timing, teams, dynamic.id, dynamic.penalties)
    solves.push(...scores.solves)
    scoreEvents.push(...scores.scoreEvents)
  }

  return {
    admin,
    teams,
    users: [admin, ...teams],
    members: buildMembers(config, teams),
    challenges,
    solves,
    scoreEvents,
    submissions,
    settings: buildSettings(config, timing),
  }
}
