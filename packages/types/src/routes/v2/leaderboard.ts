import { z } from 'zod/mini'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadNotStarted,
  BadRateLimit,
  GoodLeaderboardChallengesV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodLeaderboardWithGraph,
} from '../../responses'

export const GetLeaderboardRouteV2 = defineRoute({
  path: '/v2/leaderboard/now',
  method: 'GET',
  goodResponses: [GoodLeaderboardV2],
  badResponses: [BadNotStarted, BadBody, BadRateLimit],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(1))
      .check(
        z.describe(
          'Maximum number of entries to return. Capped by deployment config.'
        )
      ),
    offset: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(0))
      .check(z.describe('Number of leading entries to skip for pagination.')),
    division: z.optional(
      z.string().check(z.describe('Restrict results to a single division.'))
    ),
    search: z.optional(
      z
        .string()
        .check(z.minLength(2))
        .check(z.maxLength(100))
        .check(z.describe('Filter teams by name substring (2-100 characters).'))
    ),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})

export const GetLeaderboardChallengesRouteV2 = defineRoute({
  path: '/v2/leaderboard/challs',
  method: 'GET',
  goodResponses: [GoodLeaderboardChallengesV2],
  badResponses: [BadNotStarted],
  authRequired: false,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetLeaderboardGraphRouteV2 = defineRoute({
  path: '/v2/leaderboard/graph',
  method: 'GET',
  goodResponses: [GoodLeaderboardGraph],
  badResponses: [BadNotStarted, BadBody],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limit that is loaded from config
    limit: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(1))
      .check(
        z.describe(
          'Maximum number of entries to return. Capped by deployment config.'
        )
      ),
    offset: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(0))
      .check(z.describe('Number of leading entries to skip for pagination.')),
    division: z.optional(
      z.string().check(z.describe('Restrict results to a single division.'))
    ),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})

export const GetLeaderboardWithGraphRoute = defineRoute({
  path: '/v2/leaderboard/with-graph',
  method: 'GET',
  goodResponses: [GoodLeaderboardWithGraph],
  badResponses: [BadNotStarted, BadBody, BadRateLimit],
  authRequired: false,
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(1))
      .check(
        z.describe(
          'Maximum number of entries to return. Capped by deployment config.'
        )
      ),
    offset: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(0))
      .check(z.describe('Number of leading entries to skip for pagination.')),
    division: z.optional(
      z.string().check(z.describe('Restrict results to a single division.'))
    ),
    search: z.optional(
      z
        .string()
        .check(z.minLength(2))
        .check(z.maxLength(100))
        .check(z.describe('Filter teams by name substring (2-100 characters).'))
    ),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.leaderboardRead,
})
