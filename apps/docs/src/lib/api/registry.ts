import * as Types from '@rctf/types'
import type { BodyFormat, HttpMethod } from '@rctf/types'
import type { ZodSchema } from './schema'

export interface ResolvedResponse {
  kind: string
  status: number
  message: string
  dataSchema?: ZodSchema
}

export interface ResolvedRoute {
  method: HttpMethod
  path: string
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
  bodyFormat: BodyFormat
  authRequired: boolean
  optionalAuth: boolean
  serviceAuth?: 'adminBot' | 'dynamicChallenge'
  onlyWhenStarted: boolean
  onlyWhenNotFinished: boolean
  onlyWhenStartedPermissionsBypass?: number
  permissions?: number
  captchaAction?: string
  goodResponses: readonly ResolvedResponse[]
  badResponses: readonly ResolvedResponse[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRoute(value: unknown): value is ResolvedRoute {
  if (!isRecord(value)) return false
  return (
    typeof value.path === 'string' &&
    typeof value.method === 'string' &&
    Array.isArray(value.goodResponses)
  )
}

function isResponse(value: unknown): value is ResolvedResponse {
  if (!isRecord(value)) return false
  return (
    typeof value.kind === 'string' &&
    typeof value.status === 'number' &&
    typeof value.message === 'string' &&
    'schema' in value
  )
}

const localRoutes: ReadonlyArray<readonly [string, unknown]> = [
  [
    'AnalyticsScriptRoute',
    Types.defineRoute({
      method: 'GET',
      path: '/v2/integrations/analytics/script',
      goodResponses: [],
      badResponses: [],
    }),
  ],
]

const routeEntries: ReadonlyArray<readonly [string, unknown]> = [
  ...Object.entries(Types),
  ...localRoutes,
]
const responseEntries: ReadonlyArray<readonly [string, unknown]> =
  Object.entries(Types)

const routes = new Map<string, ResolvedRoute>(
  routeEntries.filter((entry): entry is readonly [string, ResolvedRoute] =>
    isRoute(entry[1])
  )
)

const responses = new Map<string, ResolvedResponse>(
  responseEntries.filter(
    (entry): entry is readonly [string, ResolvedResponse] =>
      isResponse(entry[1])
  )
)

export function resolveRoute(name: string | undefined): ResolvedRoute {
  const route = name ? routes.get(name) : undefined
  if (!route)
    throw new Error(`Unknown @rctf/types route export: ${name ?? '(missing)'}`)
  return route
}

export function resolveResponse(name: string | undefined): ResolvedResponse {
  const response = name ? responses.get(name) : undefined
  if (!response)
    throw new Error(
      `Unknown @rctf/types response export: ${name ?? '(missing)'}`
    )
  return response
}

export function permissionNames(value: number): string[] {
  const names: string[] = []
  for (const [key, bit] of Object.entries(Types.Permissions)) {
    if (typeof bit === 'number' && (value & bit) === bit) names.push(key)
  }
  return names
}
