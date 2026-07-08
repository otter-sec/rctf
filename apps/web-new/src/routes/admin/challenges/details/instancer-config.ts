import { ExposeKind } from '@rctf/types'
import type {
  GoodInstancerSchema,
  InstancerConfig,
  ResponseData,
} from '@rctf/types'

export type InstancerSchemaData = ResponseData<typeof GoodInstancerSchema>
export type InstancerSchemaEntry = InstancerSchemaData['instancers'][number]
export type ExposeConfig = NonNullable<InstancerConfig['expose']>[number]

export interface InstancerValidityInput {
  config: InstancerConfig | null
  advancedMode: boolean
  yamlError: string | null
  schemaFormValid: boolean
}

const DEFAULT_TIMEOUT_MS = 120000

export function resolveInstancer(
  schema: InstancerSchemaData | null,
  name: string | undefined
): InstancerSchemaEntry | undefined {
  const list = schema?.instancers ?? []
  if (name) {
    const requested = list.find(entry => entry.name === name)
    if (requested) return requested
  }
  return list.find(entry => entry.name === schema?.defaultInstancer) ?? list[0]
}

export function defaultExpose(): ExposeConfig {
  return {
    kind: ExposeKind.HTTPS,
    hostPrefix: 'test-challenge',
    containerName: 'app',
    containerPort: 80,
    shouldDisplay: true,
  }
}

export function defaultInstancerConfig(
  schema: InstancerSchemaData | null
): InstancerConfig {
  const entry = resolveInstancer(schema, undefined)
  return {
    challengeIntegrationId: '',
    instancer: entry?.name ?? schema?.defaultInstancer,
    config: structuredClone(entry?.defaults ?? {}),
    expose: [defaultExpose()],
    timeoutMilliseconds: DEFAULT_TIMEOUT_MS,
  }
}

export function schemasDiffer(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined
): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

export function timeoutToSeconds(milliseconds: number): number {
  return Math.round(milliseconds / 1000)
}

export function secondsToTimeout(seconds: number): number {
  return seconds * 1000
}

export function addExpose(list: readonly ExposeConfig[]): ExposeConfig[] {
  return [...list, defaultExpose()]
}

export function removeExpose(
  list: readonly ExposeConfig[],
  index: number
): ExposeConfig[] {
  return list.filter((_, i) => i !== index)
}

export function updateExpose(
  list: readonly ExposeConfig[],
  index: number,
  patch: Partial<ExposeConfig>
): ExposeConfig[] {
  return list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
}

export function resolveInstancerValidity(
  input: InstancerValidityInput
): boolean {
  if (!input.config) return true
  if (input.advancedMode) return !input.yamlError
  return input.schemaFormValid
}
