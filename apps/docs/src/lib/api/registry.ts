import * as Types from "@rctf/types"
import type { BodyFormat, HttpMethod } from "@rctf/types"
import type { ZodSchema } from "./schema"

/** A response definition reduced to the fields the reference renderer needs. */
export interface ResolvedResponse {
  kind: string
  status: number
  message: string
  dataSchema?: ZodSchema
}

/** A route definition reduced to the fields the reference renderer needs. */
export interface ResolvedRoute {
  method: HttpMethod
  path: string
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
  bodyFormat: BodyFormat
  authRequired: boolean
  optionalAuth: boolean
  serviceAuth?: "adminBot" | "dynamicChallenge"
  onlyWhenStarted: boolean
  onlyWhenNotFinished: boolean
  onlyWhenStartedPermissionsBypass?: number
  permissions?: number
  captchaAction?: string
  goodResponses: readonly ResolvedResponse[]
  badResponses: readonly ResolvedResponse[]
}

/** Narrow an unknown export to an indexable record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Recognize a `@rctf/types` route definition by its structural shape. */
function isRoute(value: unknown): value is ResolvedRoute {
  if (!isRecord(value)) return false
  return (
    typeof value.path === "string" &&
    typeof value.method === "string" &&
    Array.isArray(value.goodResponses)
  )
}

/** Recognize a `@rctf/types` response definition by its structural shape. */
function isResponse(value: unknown): value is ResolvedResponse {
  if (!isRecord(value)) return false
  return (
    typeof value.kind === "string" &&
    typeof value.status === "number" &&
    typeof value.message === "string" &&
    "schema" in value
  )
}

/**
 * A docs-local route for the analytics script endpoint, which has no entry in
 * `@rctf/types` because it returns a raw script rather than a typed response.
 * Authored with `defineRoute` so its config is validated at compile time.
 */
const localRoutes: ReadonlyArray<readonly [string, unknown]> = [
  [
    "AnalyticsScriptRoute",
    Types.defineRoute({
      method: "GET",
      path: "/v2/integrations/analytics/script",
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
    isRoute(entry[1]),
  ),
)

const responses = new Map<string, ResolvedResponse>(
  responseEntries.filter(
    (entry): entry is readonly [string, ResolvedResponse] =>
      isResponse(entry[1]),
  ),
)

/** Resolve a route export by name, throwing when it is missing or unknown. */
export function resolveRoute(name: string | undefined): ResolvedRoute {
  const route = name ? routes.get(name) : undefined
  if (!route)
    throw new Error(`Unknown @rctf/types route export: ${name ?? "(missing)"}`)
  return route
}

/** Resolve a response export by name, throwing when it is missing or unknown. */
export function resolveResponse(name: string | undefined): ResolvedResponse {
  const response = name ? responses.get(name) : undefined
  if (!response)
    throw new Error(
      `Unknown @rctf/types response export: ${name ?? "(missing)"}`,
    )
  return response
}

/** The permission flag names set in a bitmask, in declaration order. */
export function permissionNames(value: number): string[] {
  const names: string[] = []
  for (const [key, bit] of Object.entries(Types.Permissions)) {
    if (typeof bit === "number" && (value & bit) === bit) names.push(key)
  }
  return names
}
