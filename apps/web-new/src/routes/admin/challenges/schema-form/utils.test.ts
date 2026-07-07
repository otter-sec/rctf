import { describe, expect, it } from 'bun:test'
import type { JsonSchema } from './types'
import {
  collectDefs,
  defaultValue,
  getEffectiveSchema,
  getPrimaryType,
  isNullable,
  isRecordSchema,
  isTypeOneOf,
  resolveRefs,
  schemaAtPath,
  setValueAtPath,
  valueAtPath,
} from './utils'
import { validateValue } from './validate'

describe('setValueAtPath', () => {
  it('replaces the whole value when the path is empty', () => {
    expect(setValueAtPath({ a: 1 }, [], { b: 2 })).toEqual({ b: 2 })
  })

  it('sets a shallow key without mutating the input', () => {
    const input = { a: 1 }
    const result = setValueAtPath(input, ['b'], 2)
    expect(result).toEqual({ a: 1, b: 2 })
    expect(input).toEqual({ a: 1 })
  })

  it('creates intermediate objects for non-numeric keys', () => {
    const result = setValueAtPath({}, ['a', 'b', 'c'], 5)
    expect(result).toEqual({ a: { b: { c: 5 } } })
  })

  it('creates intermediate arrays when the next key is numeric', () => {
    const result = setValueAtPath({}, ['items', '0'], 'x')
    expect(result).toEqual({ items: ['x'] })
    expect(Array.isArray((result as { items: unknown }).items)).toBe(true)
  })

  it('assigns into an existing array by numeric index', () => {
    const input = { items: ['a', 'b'] }
    const result = setValueAtPath(input, ['items', '1'], 'z') as {
      items: string[]
    }
    expect(result.items).toEqual(['a', 'z'])
    expect(input.items).toEqual(['a', 'b'])
  })
})

describe('collectDefs + resolveRefs', () => {
  it('merges $defs and definitions', () => {
    const schema: JsonSchema = {
      $defs: { A: { type: 'string' } },
      definitions: { B: { type: 'number' } },
    }
    const defs = collectDefs(schema)
    expect(defs.A).toEqual({ type: 'string' })
    expect(defs.B).toEqual({ type: 'number' })
  })

  it('resolves a top-level $ref against $defs', () => {
    const defs = { A: { type: 'string' as const } }
    expect(resolveRefs({ $ref: '#/$defs/A' }, defs)).toEqual({ type: 'string' })
  })

  it('resolves refs inside properties, items, and additionalProperties', () => {
    const defs = { Leaf: { type: 'string' as const } }
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        one: { $ref: '#/$defs/Leaf' },
        many: { type: 'array', items: { $ref: '#/$defs/Leaf' } },
        map: { type: 'object', additionalProperties: { $ref: '#/$defs/Leaf' } },
      },
    }
    const resolved = resolveRefs(schema, defs)
    expect(resolved.properties?.one).toEqual({ type: 'string' })
    expect(resolved.properties?.many?.items).toEqual({ type: 'string' })
    expect(resolved.properties?.map?.additionalProperties).toEqual({
      type: 'string',
    })
  })

  it('resolves refs nested inside anyOf branches', () => {
    const defs = {
      Inner: {
        type: 'object' as const,
        properties: { x: { type: 'number' as const } },
      },
    }
    const schema: JsonSchema = {
      anyOf: [{ type: 'null' }, { $ref: '#/$defs/Inner' }],
    }
    const resolved = resolveRefs(schema, defs)
    expect(resolved.anyOf?.[1]).toEqual(defs.Inner)
  })

  it('leaves the input schema untouched', () => {
    const defs = { A: { type: 'string' as const } }
    const schema: JsonSchema = {
      type: 'object',
      properties: { a: { $ref: '#/$defs/A' } },
    }
    resolveRefs(schema, defs)
    expect(schema.properties?.a).toEqual({ $ref: '#/$defs/A' })
  })
})

describe('getPrimaryType', () => {
  it('returns a string type directly', () => {
    expect(getPrimaryType({ type: 'string' })).toBe('string')
  })

  it('prefers the non-null member of a type array', () => {
    expect(getPrimaryType({ type: ['null', 'number'] })).toBe('number')
  })

  it('derives the type from the non-null anyOf branch', () => {
    expect(
      getPrimaryType({ anyOf: [{ type: 'null' }, { type: 'boolean' }] })
    ).toBe('boolean')
  })
})

describe('isNullable', () => {
  it('detects the nullable flag, null in a type array, and null anyOf branches', () => {
    expect(isNullable({ type: 'string', nullable: true })).toBe(true)
    expect(isNullable({ type: ['string', 'null'] })).toBe(true)
    expect(isNullable({ anyOf: [{ type: 'null' }, { type: 'string' }] })).toBe(
      true
    )
    expect(isNullable({ type: 'string' })).toBe(false)
  })
})

describe('getEffectiveSchema', () => {
  it('collapses an anyOf-nullable schema to its non-null branch', () => {
    const effective = getEffectiveSchema({
      title: 'Port',
      anyOf: [{ type: 'null' }, { type: 'integer', minimum: 1 }],
    })
    expect(effective.type).toBe('integer')
    expect(effective.minimum).toBe(1)
    expect(effective.title).toBe('Port')
    expect(effective.anyOf).toBeUndefined()
  })
})

describe('isTypeOneOf', () => {
  it('matches string and array-of-types forms', () => {
    expect(isTypeOneOf('string', ['string', 'number'])).toBe(true)
    expect(isTypeOneOf(['null', 'number'], ['number'])).toBe(true)
    expect(isTypeOneOf('boolean', ['string'])).toBe(false)
    expect(isTypeOneOf(undefined, ['string'])).toBe(false)
  })
})

describe('defaultValue', () => {
  it('deep-clones the schema default so mutations do not leak back', () => {
    const schema: JsonSchema = { type: 'object', default: { nested: { a: 1 } } }
    const value = defaultValue(schema) as { nested: { a: number } }
    value.nested.a = 99
    expect((schema.default as { nested: { a: number } }).nested.a).toBe(1)
  })

  it('seeds only required and defaulted object properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['name', 'tags'],
      properties: {
        name: { type: 'string' },
        count: { type: 'integer' },
        on: { type: 'boolean', default: true },
        tags: { type: 'array' },
      },
    }
    expect(defaultValue(schema)).toEqual({
      name: '',
      on: true,
      tags: [],
    })
  })

  it('leaves optional undefaulted properties absent so they validate as unset', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        interval: { type: 'string', pattern: '^\\d+s$' },
        retries: { type: 'integer', minimum: 1 },
      },
    }
    expect(defaultValue(schema)).toEqual({})
  })

  it('uses null for nullable primitives', () => {
    expect(defaultValue({ type: 'string', nullable: true })).toBeNull()
  })
})

describe('isRecordSchema', () => {
  it('matches objects with additionalProperties and no properties', () => {
    expect(
      isRecordSchema({
        type: 'object',
        additionalProperties: { type: 'string' },
      })
    ).toBe(true)
    expect(isRecordSchema({ type: 'object', additionalProperties: true })).toBe(
      true
    )
    expect(
      isRecordSchema({ type: 'object', properties: { a: { type: 'string' } } })
    ).toBe(false)
    expect(isRecordSchema({ type: 'array' })).toBe(false)
  })
})

describe('schemaAtPath', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      pods: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            containers: {
              type: 'array',
              items: {
                type: 'object',
                properties: { image: { type: 'string' } },
              },
            },
          },
        },
      },
      limits: {
        anyOf: [
          { type: 'null' },
          { type: 'object', properties: { cpu: { type: 'integer' } } },
        ],
      },
    },
  }

  it('returns the root schema for an empty path', () => {
    expect(schemaAtPath(schema, [])).toBe(schema)
  })

  it('walks properties, record values, and array items', () => {
    expect(
      schemaAtPath(schema, ['pods', 'app', 'containers', '0', 'image'])
    ).toEqual({
      type: 'string',
    })
  })

  it('walks through anyOf-nullable branches', () => {
    expect(schemaAtPath(schema, ['limits', 'cpu'])).toEqual({ type: 'integer' })
  })

  it('returns null for unknown properties and paths through leaves', () => {
    expect(schemaAtPath(schema, ['nope'])).toBeNull()
    expect(
      schemaAtPath(schema, [
        'pods',
        'app',
        'containers',
        '0',
        'image',
        'deeper',
      ])
    ).toBeNull()
  })
})

describe('valueAtPath', () => {
  const value = { pods: { app: { containers: [{ image: 'nginx' }] } } }

  it('returns the root value for an empty path', () => {
    expect(valueAtPath(value, [])).toBe(value)
  })

  it('walks objects and arrays by segment', () => {
    expect(
      valueAtPath(value, ['pods', 'app', 'containers', '0', 'image'])
    ).toBe('nginx')
  })

  it('returns undefined when a segment is missing or the node is not a container', () => {
    expect(
      valueAtPath(value, ['pods', 'missing', 'containers'])
    ).toBeUndefined()
    expect(
      valueAtPath(value, ['pods', 'app', 'containers', '0', 'image', 'x'])
    ).toBeUndefined()
    expect(valueAtPath(null, ['pods'])).toBeUndefined()
  })
})

describe('integration: instancer-like provider schema', () => {
  const schema: JsonSchema = {
    type: 'object',
    $defs: {
      Resources: {
        type: 'object',
        properties: {
          cpu: { type: 'integer', minimum: 1 },
          memory: { type: 'string', pattern: '^[0-9]+[MG]i$' },
        },
        required: ['cpu'],
      },
    },
    properties: {
      image: { type: 'string', minLength: 1 },
      replicas: { type: 'integer', minimum: 1, maximum: 10 },
      protocol: { enum: ['tcp', 'udp'] },
      env: { type: 'array', items: { type: 'string' } },
      resources: { anyOf: [{ type: 'null' }, { $ref: '#/$defs/Resources' }] },
    },
    required: ['image'],
  }

  it('resolves the $ref inside the anyOf branch', () => {
    const resolved = resolveRefs(schema, collectDefs(schema))
    const resources = resolved.properties?.resources
    expect(resources?.anyOf?.[1]?.properties?.cpu).toEqual({
      type: 'integer',
      minimum: 1,
    })
  })

  it('validates each leaf against its constraints', () => {
    const props = schema.properties!
    expect(validateValue(props.image!, '').error).toBe('Cannot be empty')
    expect(validateValue(props.replicas!, 20).valid).toBe(false)
    expect(validateValue(props.protocol!, 'sctp').valid).toBe(false)
    expect(validateValue(props.protocol!, 'tcp').valid).toBe(true)
    const resources = resolveRefs(schema, collectDefs(schema)).properties!
      .resources!
    const cpuSchema = resources.anyOf![1]!.properties!.cpu!
    expect(validateValue(cpuSchema, 0).valid).toBe(false)
    expect(validateValue(cpuSchema, 2).valid).toBe(true)
  })
})
