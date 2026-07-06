import { ExposeKind } from '@rctf/types'
import { describe, expect, it } from 'bun:test'
import {
  addExpose,
  defaultExpose,
  defaultInstancerConfig,
  removeExpose,
  resolveInstancer,
  resolveInstancerValidity,
  schemasDiffer,
  secondsToTimeout,
  timeoutToSeconds,
  updateExpose,
  type InstancerSchemaData,
} from './instancer-config'

function schemaData(): InstancerSchemaData {
  return {
    defaultInstancer: 'kubernetes',
    instancers: [
      {
        name: 'kubernetes',
        schema: { type: 'object', properties: { image: { type: 'string' } } },
        defaults: { image: 'nginx', replicas: 1 },
        canStop: true,
        canExtend: true,
      },
      {
        name: 'nomad',
        schema: { type: 'object', properties: { job: { type: 'string' } } },
        defaults: { job: 'web' },
        canStop: false,
        canExtend: false,
      },
    ],
  }
}

describe('defaultInstancerConfig', () => {
  it('seeds the documented shape from the default instancer', () => {
    const config = defaultInstancerConfig(schemaData())
    expect(config.challengeIntegrationId).toBe('')
    expect(config.instancer).toBe('kubernetes')
    expect(config.config).toEqual({ image: 'nginx', replicas: 1 })
    expect(config.timeoutMilliseconds).toBe(120000)
    expect(config.expose).toEqual([
      {
        kind: ExposeKind.HTTPS,
        hostPrefix: 'test-challenge',
        containerName: 'app',
        containerPort: 80,
        shouldDisplay: true,
      },
    ])
  })

  it('deep-clones the provider defaults so edits do not leak back', () => {
    const data = schemaData()
    const config = defaultInstancerConfig(data)
    ;(config.config as Record<string, unknown>).image = 'edited'
    expect(data.instancers[0]!.defaults).toEqual({
      image: 'nginx',
      replicas: 1,
    })
  })

  it('falls back to an empty config when no schema is available', () => {
    const config = defaultInstancerConfig(null)
    expect(config.instancer).toBeUndefined()
    expect(config.config).toEqual({})
    expect(config.expose).toHaveLength(1)
  })

  it('picks the first instancer when the default name is unknown', () => {
    const data = schemaData()
    data.defaultInstancer = 'missing'
    expect(defaultInstancerConfig(data).instancer).toBe('kubernetes')
  })
})

describe('resolveInstancer', () => {
  it('prefers the requested name when present', () => {
    expect(resolveInstancer(schemaData(), 'nomad')?.name).toBe('nomad')
  })

  it('falls back to the default, then the first entry', () => {
    expect(resolveInstancer(schemaData(), 'unknown')?.name).toBe('kubernetes')
    const data = schemaData()
    data.defaultInstancer = 'unknown'
    expect(resolveInstancer(data, undefined)?.name).toBe('kubernetes')
  })

  it('returns undefined for a null schema', () => {
    expect(resolveInstancer(null, 'kubernetes')).toBeUndefined()
  })
})

describe('schemasDiffer', () => {
  it('is false for structurally equal schemas', () => {
    expect(schemasDiffer({ type: 'object' }, { type: 'object' })).toBe(false)
  })

  it('is true when the schemas diverge', () => {
    expect(schemasDiffer({ type: 'object' }, { type: 'string' })).toBe(true)
    expect(schemasDiffer(undefined, { type: 'string' })).toBe(true)
  })
})

describe('timeout converters', () => {
  it('round-trips seconds and milliseconds', () => {
    expect(timeoutToSeconds(120000)).toBe(120)
    expect(secondsToTimeout(120)).toBe(120000)
  })

  it('rounds fractional seconds to the nearest whole second', () => {
    expect(timeoutToSeconds(2500)).toBe(3)
    expect(timeoutToSeconds(2400)).toBe(2)
  })
})

describe('expose helpers', () => {
  it('appends a default expose without mutating the input', () => {
    const list = [defaultExpose()]
    const next = addExpose(list)
    expect(next).toHaveLength(2)
    expect(list).toHaveLength(1)
    expect(next[1]).toEqual(defaultExpose())
  })

  it('removes an expose by index immutably', () => {
    const list = [defaultExpose(), { ...defaultExpose(), hostPrefix: 'second' }]
    const next = removeExpose(list, 0)
    expect(next).toHaveLength(1)
    expect(next[0]!.hostPrefix).toBe('second')
    expect(list).toHaveLength(2)
  })

  it('patches only the targeted expose immutably', () => {
    const list = [defaultExpose(), defaultExpose()]
    const next = updateExpose(list, 1, { containerPort: 8080 })
    expect(next[1]!.containerPort).toBe(8080)
    expect(next[0]!.containerPort).toBe(80)
    expect(list[1]!.containerPort).toBe(80)
    expect(next[0]).toBe(list[0]!)
  })
})

describe('resolveInstancerValidity', () => {
  const base = {
    config: defaultInstancerConfig(schemaData()),
    advancedMode: false,
    yamlError: null,
    schemaFormValid: true,
  }

  it('is always valid when the instancer is disabled', () => {
    expect(
      resolveInstancerValidity({
        ...base,
        config: null,
        advancedMode: true,
        yamlError: 'broken',
        schemaFormValid: false,
      })
    ).toBe(true)
  })

  it('follows the YAML error in advanced mode', () => {
    expect(
      resolveInstancerValidity({
        ...base,
        advancedMode: true,
        yamlError: 'bad',
      })
    ).toBe(false)
    expect(
      resolveInstancerValidity({ ...base, advancedMode: true, yamlError: null })
    ).toBe(true)
  })

  it('follows the schema-form validity in form mode', () => {
    expect(resolveInstancerValidity({ ...base, schemaFormValid: true })).toBe(
      true
    )
    expect(resolveInstancerValidity({ ...base, schemaFormValid: false })).toBe(
      false
    )
  })
})
