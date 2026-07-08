import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: false }))

let core!: typeof import('$lib/query/core')

beforeAll(async () => {
  core = await import('$lib/query/core')
})

describe('unwrapData', () => {
  type Response =
    | { kind: 'goodThing'; message: string; data: { value: number } }
    | { kind: 'badThing'; message: string }

  test('returns data for the good kind', () => {
    const response: Response = {
      kind: 'goodThing',
      message: 'ok',
      data: { value: 42 },
    }
    expect(core.unwrapData(response, { kind: 'goodThing' })).toEqual({
      value: 42,
    })
  })

  test('throws ApiError for other kinds', () => {
    const response = { kind: 'badThing', message: 'nope' } as Response
    let caught: unknown
    try {
      core.unwrapData(response, { kind: 'goodThing' })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(core.ApiError)
    expect((caught as InstanceType<typeof core.ApiError>).kind).toBe('badThing')
    expect((caught as InstanceType<typeof core.ApiError>).message).toBe('nope')
  })
})
