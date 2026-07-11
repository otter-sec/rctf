import {
  BadRateLimit,
  BadToken,
  isFileField,
  type AnyRouteDefinition,
  type ClientConfig,
  type ResponseDefinition,
  type RouteBodyInput,
  type RouteParamsInput,
  type RouteQueryInput,
  type RouteResponse,
} from '@rctf/types'
import { browser } from '$app/environment'
import { toast } from '$lib/toast'
import { CaptchaError, getCaptchaCode } from '$lib/utils/captcha'
import { prettifyError } from 'zod/mini'

export function showApiError(response: {
  kind: string
  message: string
  data?: unknown
}): void {
  if (response.kind !== BadRateLimit.kind) {
    toast.error(response.message)
    return
  }

  const timeLeft = (response.data as { timeLeft?: number })?.timeLeft
  if (timeLeft !== undefined) {
    const seconds = Math.max(1, Math.round(timeLeft / 1000))
    toast.error(`Try again in ${seconds} second${seconds !== 1 ? 's' : ''}`)
    return
  }

  toast.error(response.message)
}

let apiFetch: typeof globalThis.fetch | null = null

let authChangeHandler: (() => void) | null = null

export function setAuthChangeHandler(handler: () => void): void {
  authChangeHandler = handler
}

export function setApiFetch(fetchFn: typeof globalThis.fetch): void {
  apiFetch = fetchFn
}

let cachedClientConfig: ClientConfig | null = null

export function setClientConfig(config: ClientConfig): void {
  cachedClientConfig = config
}

export function getClientConfig(): ClientConfig | null {
  return cachedClientConfig
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
  if (!browser || getToken() === token) return
  localStorage.setItem('token', token)
  authChangeHandler?.()
}

export function clearToken(): void {
  if (!browser || getToken() === null) return
  localStorage.removeItem('token')
  authChangeHandler?.()
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
    if (rawValue === undefined) {
      continue
    }

    url.searchParams.set(key, String(rawValue))
  }
}

const parseResponse = <TRoute extends AnyRouteDefinition>(
  route: TRoute,
  payload: unknown
): RouteResponse<TRoute> => {
  const envelope: ApiResponseShape = {
    kind: (payload as ApiResponseShape)?.kind ?? 'unknown',
    message: (payload as ApiResponseShape)?.message ?? 'Unknown error',
    data: (payload as ApiResponseShape)?.data ?? null,
  }

  if (envelope.kind === BadToken.kind) {
    clearToken()
  }

  const definitions: ResponseDefinition[] = [
    ...route.goodResponses,
    ...route.badResponses,
  ]
  const definition = definitions.find(
    definition => definition.kind === envelope.kind
  )
  if (!definition) {
    throw new Error(`Unknown response kind: ${JSON.stringify(payload)}`)
  }

  const parsed = definition.schema.safeParse(envelope)
  if (!parsed.success) {
    throw new Error(
      `Failed to validate API response for ${route.method} ${route.path}:\n${prettifyError(parsed.error)}`
    )
  }

  return parsed.data as RouteResponse<TRoute>
}

const parseSection = (
  route: AnyRouteDefinition,
  label: 'params' | 'query' | 'body',
  source: Record<string, unknown>
) => {
  const schema = route[label]
  if (!schema) return undefined
  const result = schema.safeParse(source)
  if (!result.success) {
    throw new Error(
      `Invalid ${label} for ${route.method} ${route.path}:\n${prettifyError(result.error)}`
    )
  }
  return result.data
}

const pickArgs = <TRoute extends AnyRouteDefinition>(
  route: TRoute,
  args: InlineArgs<TRoute> | undefined
) => {
  const inlineSource = (args ?? {}) as Record<string, unknown>
  return {
    params: parseSection(route, 'params', inlineSource),
    query: parseSection(route, 'query', inlineSource),
    body: parseSection(route, 'body', inlineSource),
  }
}

const buildFormDataBody = (payload: Record<string, unknown>): FormData => {
  const formData = new FormData()

  const appendValue = (key: string, value: unknown) => {
    if (value === undefined) return
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
    try {
      const captchaCode = await getCaptchaCode(
        route.captchaAction,
        cachedClientConfig
      )
      if (captchaCode) {
        const captchaField = route.path.startsWith('/v1/')
          ? 'recaptchaCode'
          : 'captchaCode'
        finalBody = { ...finalBody, [captchaField]: captchaCode }
      }
    } catch (err) {
      if (err instanceof CaptchaError) {
        toast.error(err.message)
      }
      throw err
    }
  }

  const path = applyPath(route.path, params).replace(/^\//, '')
  const origin = browser ? window.location.origin : 'http://localhost'
  const url = new URL(`/api/${path}`, origin)
  applyQuery(url, query as Record<string, unknown> | undefined)

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

  const res = await (apiFetch ?? fetch)(url, {
    method: route.method,
    headers,
    cache: 'no-store',
    body: requestBody,
  })

  const payload = await res.json()
  return parseResponse(route, payload)
}
