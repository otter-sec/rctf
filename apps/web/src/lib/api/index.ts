import {
  BadToken,
  isFileField,
  type AnyRouteDefinition,
  type RouteBodyInput,
  type RouteParamsInput,
  type RouteQueryInput,
  type RouteResponse,
} from '@rctf/types'
import { browser } from '$app/environment'
import { getCaptchaCode } from '$lib/utils/captcha'
import type { ClientConfig } from './types'

export * from './types'

let cachedClientConfig: ClientConfig | null = null

export function setClientConfig(config: ClientConfig): void {
  cachedClientConfig = config
}

type SectionPayload<T> = [T] extends [undefined]
  ? {}
  : T extends Record<string, unknown>
    ? T
    : {}

export type InlineArgs<TRoute extends AnyRouteDefinition> = SectionPayload<
  RouteParamsInput<TRoute>
> &
  SectionPayload<RouteQueryInput<TRoute>> &
  SectionPayload<RouteBodyInput<TRoute>>

type ApiResponseShape = {
  kind: string
  message: string
  data: unknown
}

function getToken(): string | null {
  return browser ? localStorage.getItem('token') : null
}

export function setToken(token: string): void {
  if (browser) {
    localStorage.setItem('token', token)
  }
}

export function clearToken(): void {
  if (browser) {
    localStorage.removeItem('token')
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null
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
  payload: any
): RouteResponse<TRoute> => {
  const envelope: ApiResponseShape = {
    kind: payload?.kind ?? 'unknown',
    message: payload?.message ?? 'Unknown error',
    data: payload?.data ?? null,
  }

  if (envelope.kind === BadToken.kind) {
    clearToken()
  }

  const definition = route.responses.find(
    definition => definition.kind === envelope.kind
  )
  if (!definition) {
    throw new Error(`Unknown response kind: ${JSON.stringify(payload)}`)
  }

  const parsed = definition.schema.safeParse(envelope)
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

const buildFormDataBody = (payload: Record<string, unknown>): FormData => {
  const formData = new FormData()

  const appendValue = (key: string, value: unknown) => {
    if (value === undefined) {
      return
    }

    if (value === null) {
      formData.append(key, '')
      return
    }

    if (Array.isArray(value)) {
      value.forEach(item => appendValue(key, item))
      return
    }

    if (isFileField(value)) {
      formData.append(key, value)
      return
    }

    if (value instanceof Date) {
      formData.append(key, value.toISOString())
      return
    }

    formData.append(key, String(value))
  }

  for (const [key, value] of Object.entries(payload)) {
    appendValue(key, value)
  }

  return formData
}

export async function apiRequest<TRoute extends AnyRouteDefinition>(
  route: TRoute,
  args?: InlineArgs<TRoute>
): Promise<RouteResponse<TRoute>> {
  const { params, query, body } = pickArgs(route, args)

  let finalBody = body as Record<string, unknown> | undefined
  if (route.captchaAction && finalBody) {
    const captchaCode = await getCaptchaCode(
      route.captchaAction,
      cachedClientConfig
    )
    if (captchaCode) {
      finalBody = { ...finalBody, captchaCode }
    }
  }

  const path = applyPath(route.path, params).replace(/^\//, '')
  const origin = browser ? window.location.origin : 'http://localhost'
  const url = new URL(`/api/${path}`, origin)
  applyQuery(url, query)

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let requestBody: BodyInit | undefined
  const expectsBody = Boolean(route.body && finalBody !== undefined)
  if (expectsBody) {
    if (route.bodyFormat === 'form-data') {
      requestBody = buildFormDataBody(finalBody as Record<string, unknown>)
    } else {
      headers['Content-Type'] = 'application/json'
      requestBody = JSON.stringify(finalBody)
    }
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
