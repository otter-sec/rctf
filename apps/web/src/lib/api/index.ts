import {
  BadToken,
  type AnyRouteDefinition,
  type RouteBodyInput,
  type RouteParamsInput,
  type RouteQueryInput,
  type RouteResponse,
} from '@rctf/types'

export * from './types'

// TODO(es3n1n): map api to /api and replace this with /
const base = 'https://rctf-dev.es3n1n.io/'

type SectionPayload<T> = [T] extends [undefined]
  ? {}
  : T extends Record<string, unknown>
    ? T
    : {}

type InlineArgs<TRoute extends AnyRouteDefinition> = SectionPayload<
  RouteParamsInput<TRoute>
> &
  SectionPayload<RouteQueryInput<TRoute>> &
  SectionPayload<RouteBodyInput<TRoute>>

type ApiResponseShape = {
  kind: string
  message: string
  data: unknown
}

const applyPath = (
  path: string,
  params: Record<string, unknown> | undefined
): string => {
  if (!params) {
    return path
  }

  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined || value === null) {
      throw new Error(`Missing value for route param "${key}"`)
    }
    return encodeURIComponent(String(value))
  })
}

const applyQuery = (url: URL, query: Record<string, unknown> | undefined) => {
  for (const [key, rawValue] of Object.entries(query || {})) {
    url.searchParams.set(key, String(rawValue))
  }
}

const parseResponse = <TRoute extends AnyRouteDefinition>(
  route: TRoute,
  payload: unknown
): RouteResponse<TRoute> => {
  const envelope = payload as ApiResponseShape

  /// Special handling of the dynamic unauthorized response
  if (envelope.kind === BadToken.kind) {
    localStorage.removeItem('token')
    window.location.reload()
  }

  const definition = route.responses.find(
    definition => definition.kind === envelope.kind
  )
  if (!definition) {
    throw new Error(`Unknown response kind: ${JSON.stringify(envelope)}`)
  }

  const parsed = definition.schema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      `Failed to validate API response for ${route.method} ${route.path}: ${parsed.error}`
    )
  }

  return parsed.data as RouteResponse<TRoute>
}

const pickArgs = <TRoute extends AnyRouteDefinition>(
  route: TRoute,
  args: InlineArgs<TRoute> | undefined
) => {
  const inlineSource = args || {}
  return {
    params: route.params ? route.params.parse(inlineSource) : undefined,
    query: route.query ? route.query.parse(inlineSource) : undefined,
    body: route.body ? route.body.parse(inlineSource) : undefined,
  }
}

export async function apiRequest<TRoute extends AnyRouteDefinition>(
  route: TRoute,
  args?: InlineArgs<TRoute>
): Promise<RouteResponse<TRoute>> {
  const { params, query, body } = pickArgs(route, args)

  const url = new URL(`${base}api/${applyPath(route.path, params)}`)
  applyQuery(url, query as Record<string, unknown> | undefined)

  // TODO: Remove once we have actual authorization logic
  if (!localStorage.token) {
    localStorage.token =
      'mMnAUAKo8YKQ0jReAMBq226mH2DPPs8IAWbD7ZeymBpHInswQ6DM5M6FPfc6J2+QoAy/ZVTsxjzsNOHf/NipqP9fQMkMgBwddGQfBT49ZUq4YIIZufqCToAHMbaF'
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (localStorage.token) {
    headers['Authorization'] = `Bearer ${localStorage.token}`
  }

  let requestBody: string | undefined
  if (route.body && body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  const res = await fetch(url, {
    method: route.method,
    headers,
    cache: 'no-store',
    body: requestBody,
  })

  const payload = await res.json()
  return parseResponse(route, payload)
}
