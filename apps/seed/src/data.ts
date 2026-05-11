import type { ServerConfig } from '@rctf/config'
import type { Challenge, Settings, Solve, User, UserMember } from '@rctf/db'
import { Permissions } from '@rctf/types'

export type SeedData = {
  admin: User
  teams: User[]
  users: User[]
  members: UserMember[]
  challenges: Challenge[]
  solves: Solve[]
  settings: Settings
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
export const SEED_TEAM_COUNT = 48
export const SEED_CHALLENGE_COUNT = 18
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
const solveEndOffset = 5 * 60_000

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const titleCase = (value: string) =>
  value.replace(/\b[a-z]/g, letter => letter.toUpperCase())

const randomItem = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)]!

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

  return Array.from({ length: SEED_CHALLENGE_COUNT }, (_, index) => {
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
  })
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

function buildSettings(config: ServerConfig, timing: SeedTiming): Settings {
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

export function buildSeedData(config: ServerConfig): SeedData {
  const timing = buildSeedTiming(config)
  const admin = buildAdmin()
  const teams = buildTeams(config, SEED_TEAM_COUNT)
  const challenges = buildChallenges()

  return {
    admin,
    teams,
    users: [admin, ...teams],
    members: buildMembers(config, teams),
    challenges,
    solves: buildSolves(timing, teams, challenges),
    settings: buildSettings(config, timing),
  }
}
