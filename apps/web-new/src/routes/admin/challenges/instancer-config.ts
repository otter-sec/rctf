import { ExposeKind } from '@rctf/types'
import type {
  GoodInstancerSchema,
  InstancerConfig,
  ResponseData,
} from '@rctf/types'

/** The `/v2/admin/instancer/schema` payload: available instancers + defaults. */
export type InstancerSchemaData = ResponseData<typeof GoodInstancerSchema>
/** One registered instancer with its config schema, defaults, and capabilities. */
export type InstancerSchemaEntry = InstancerSchemaData['instancers'][number]
/** A single exposed-port entry within an instancer config. */
export type ExposeConfig = NonNullable<InstancerConfig['expose']>[number]

/** Inputs to {@link resolveInstancerValidity}, mirroring the pane's live state. */
export interface InstancerValidityInput {
  config: InstancerConfig | null
  advancedMode: boolean
  yamlError: string | null
  schemaFormValid: boolean
}

const DEFAULT_TIMEOUT_MS = 120000
const MIN_PORT = 1
const MAX_PORT = 65535

/**
 * Picks the instancer to edit: the requested name when it is registered,
 * otherwise the deployment default, otherwise the first entry.
 *
 * @param schema - The instancer schema payload, or null when unavailable.
 * @param name - The currently selected instancer name, if any.
 */
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

/** The default exposed-port entry seeded for a freshly enabled instancer. */
export function defaultExpose(): ExposeConfig {
  return {
    kind: ExposeKind.HTTPS,
    hostPrefix: 'test-challenge',
    containerName: 'app',
    containerPort: 80,
    shouldDisplay: true,
  }
}

/**
 * Seeds a fresh instancer config from the schema payload: the default (or first)
 * instancer, a deep clone of its provider defaults, one default expose, and a
 * two-minute lifetime.
 *
 * @param schema - The instancer schema payload, or null when unavailable.
 */
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

/**
 * Whether two provider schemas differ. Switching instancers resets the provider
 * config to the target's defaults only when its schema is not identical.
 */
export function schemasDiffer(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined
): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

/** Converts a lifetime in milliseconds to whole seconds for the timeout input. */
export function timeoutToSeconds(milliseconds: number): number {
  return Math.round(milliseconds / 1000)
}

/** Converts a timeout in seconds back to the milliseconds stored in the config. */
export function secondsToTimeout(seconds: number): number {
  return seconds * 1000
}

/** Appends a default exposed-port entry, returning a new array. */
export function addExpose(list: readonly ExposeConfig[]): ExposeConfig[] {
  return [...list, defaultExpose()]
}

/** Removes the exposed-port entry at `index`, returning a new array. */
export function removeExpose(
  list: readonly ExposeConfig[],
  index: number
): ExposeConfig[] {
  return list.filter((_, i) => i !== index)
}

/** Patches the exposed-port entry at `index`, returning a new array. */
export function updateExpose(
  list: readonly ExposeConfig[],
  index: number,
  patch: Partial<ExposeConfig>
): ExposeConfig[] {
  return list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
}

/** Whether a container port is a whole number within the valid 1–65535 range. */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT
}

/**
 * Resolves the instancer tab's contribution to the save gate: a disabled
 * instancer never blocks saving, advanced mode blocks on a YAML parse error,
 * and form mode blocks on schema-form validation.
 *
 * @param input - The pane's live config, mode, and validation state.
 */
export function resolveInstancerValidity(
  input: InstancerValidityInput
): boolean {
  if (!input.config) return true
  if (input.advancedMode) return !input.yamlError
  return input.schemaFormValid
}
