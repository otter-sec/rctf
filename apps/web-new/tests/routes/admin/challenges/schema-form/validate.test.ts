import type { JsonSchema } from '$routes/admin/challenges/schema-form/types'
import { validateValue } from '$routes/admin/challenges/schema-form/validate'
import { describe, expect, it } from 'bun:test'

const ok = (schema: JsonSchema, value: unknown) =>
  expect(validateValue(schema, value).valid).toBe(true)
const bad = (schema: JsonSchema, value: unknown) => {
  const result = validateValue(schema, value)
  expect(result.valid).toBe(false)
  expect(result.error).toBeString()
}

describe('validateValue - null/undefined short-circuit', () => {
  it('treats undefined and null as valid regardless of type', () => {
    ok({ type: 'string' }, undefined)
    ok({ type: 'string' }, null)
  })
})

describe('validateValue - type', () => {
  it('accepts matching primitives and rejects mismatches', () => {
    ok({ type: 'string' }, 'x')
    bad({ type: 'string' }, 5)
    ok({ type: 'number' }, 5)
    bad({ type: 'number' }, 'x')
    ok({ type: 'boolean' }, true)
    bad({ type: 'boolean' }, 'x')
    ok({ type: 'array' }, [])
    bad({ type: 'array' }, {})
    ok({ type: 'object' }, {})
    bad({ type: 'object' }, [])
  })

  it('distinguishes integer from number', () => {
    ok({ type: 'integer' }, 4)
    bad({ type: 'integer' }, 4.5)
  })

  it('rejects NaN for number', () => {
    bad({ type: 'number' }, NaN)
  })

  it('supports type arrays', () => {
    ok({ type: ['string', 'number'] }, 'x')
    ok({ type: ['string', 'number'] }, 3)
    bad({ type: ['string', 'number'] }, true)
  })
})

describe('validateValue - string constraints', () => {
  it('enforces minLength with the empty message at 1', () => {
    expect(validateValue({ type: 'string', minLength: 1 }, '')).toEqual({
      valid: false,
      error: 'Cannot be empty',
    })
    ok({ type: 'string', minLength: 1 }, 'a')
  })

  it('enforces minLength above 1 with a character-count message', () => {
    expect(validateValue({ type: 'string', minLength: 3 }, 'ab').error).toBe(
      'Must be at least 3 characters'
    )
    ok({ type: 'string', minLength: 3 }, 'abc')
  })

  it('enforces maxLength', () => {
    bad({ type: 'string', maxLength: 2 }, 'abc')
    ok({ type: 'string', maxLength: 2 }, 'ab')
  })

  it('enforces pattern', () => {
    ok({ type: 'string', pattern: '^[a-z]+$' }, 'abc')
    bad({ type: 'string', pattern: '^[a-z]+$' }, 'ABC')
  })

  it('ignores an invalid pattern (treats it as passing)', () => {
    ok({ type: 'string', pattern: '(' }, 'anything')
  })
})

describe('validateValue - number constraints', () => {
  it('enforces minimum and maximum inclusively', () => {
    bad({ type: 'number', minimum: 5 }, 4)
    ok({ type: 'number', minimum: 5 }, 5)
    bad({ type: 'number', maximum: 5 }, 6)
    ok({ type: 'number', maximum: 5 }, 5)
  })

  it('enforces exclusiveMinimum strictly', () => {
    bad({ type: 'number', exclusiveMinimum: 0 }, 0)
    ok({ type: 'number', exclusiveMinimum: 0 }, 1)
  })

  it('enforces multipleOf', () => {
    bad({ type: 'number', multipleOf: 5 }, 7)
    ok({ type: 'number', multipleOf: 5 }, 10)
  })
})

describe('validateValue - enum', () => {
  it('accepts allowed values and rejects others', () => {
    ok({ enum: ['a', 'b'] }, 'a')
    bad({ enum: ['a', 'b'] }, 'c')
  })
})

describe('validateValue - anyOf', () => {
  it('passes when any branch matches', () => {
    ok({ anyOf: [{ type: 'string' }, { type: 'number' }] }, 3)
  })

  it('fails when no branch matches', () => {
    bad({ anyOf: [{ type: 'string' }, { type: 'number' }] }, true)
  })
})

describe('validateValue - oneOf', () => {
  it('passes when exactly one branch matches', () => {
    ok({ oneOf: [{ type: 'string' }, { type: 'number' }] }, 'x')
  })

  it('fails when no branch matches', () => {
    bad({ oneOf: [{ type: 'string' }, { type: 'number' }] }, true)
  })

  it('fails when more than one branch matches', () => {
    const result = validateValue(
      { oneOf: [{ type: 'number' }, { type: 'integer' }] },
      4
    )
    expect(result.valid).toBe(false)
    expect(result.error).toBe(
      'Matches multiple types (should match exactly one)'
    )
  })
})

describe('validateValue - nullable', () => {
  it('accepts null for a nullable schema', () => {
    ok({ type: 'string', nullable: true }, null)
  })
})

describe('validateValue - unsupported keywords', () => {
  it('throws when the schema uses an unsupported keyword', () => {
    expect(() => validateValue({ type: 'object', properties: {} }, {})).toThrow(
      /Unsupported JSON Schema keywords/
    )
  })

  it('allows metadata keywords without throwing', () => {
    ok({ type: 'string', title: 'Name', description: 'd', default: 'x' }, 'v')
  })

  it('treats format as metadata (the co-emitted pattern carries the constraint)', () => {
    ok({ type: 'string', format: 'ipv4', pattern: '^[\\d.]+$' }, '1.1.1.1')
    bad({ type: 'string', format: 'ipv4', pattern: '^[\\d.]+$' }, 'nope')
  })
})
