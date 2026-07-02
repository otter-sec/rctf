import { ExposeKind, InstanceStatus } from '@rctf/types'
import {
  formatEndpoint,
  instancePollInterval,
  type InstancerEndpoint,
} from '$lib/utils/instancer'
import { describe, expect, test } from 'bun:test'

const endpoint = (
  overrides: Partial<InstancerEndpoint> & Pick<InstancerEndpoint, 'kind'>
): InstancerEndpoint => ({
  host: 'chall.rctf.io',
  port: 1337,
  ...overrides,
})

describe('formatEndpoint value + protocol tag', () => {
  // [kind, port, expected value, expected protocol tag]
  const cases: [ExposeKind, number, string, string | undefined][] = [
    [ExposeKind.HTTP, 8080, 'http://chall.rctf.io:8080', 'http'],
    [ExposeKind.HTTP, 80, 'http://chall.rctf.io', 'http'],
    [ExposeKind.HTTPS, 8443, 'https://chall.rctf.io:8443', 'https'],
    [ExposeKind.HTTPS, 443, 'https://chall.rctf.io', 'https'],
    [ExposeKind.TCP, 1337, 'nc chall.rctf.io 1337', 'tcp'],
    [ExposeKind.TCP_SSL, 1337, 'ncat --ssl chall.rctf.io 1337', 'TCP+SSL'],
  ]

  test.each(cases)(
    '%s :%i -> %p (tag %p)',
    (kind, port, expectedValue, expectedTag) => {
      const result = formatEndpoint(endpoint({ kind, port }), 0, 1)
      expect(result.value).toBe(expectedValue)
      expect(result.copyValue).toBe(expectedValue)
      expect(result.protocolTag).toBe(expectedTag)
    }
  )

  test('raw passes server-provided text verbatim and hides the protocol tag', () => {
    const result = formatEndpoint(
      endpoint({ kind: ExposeKind.RAW, text: 'connect via the portal' }),
      0,
      1
    )
    expect(result.value).toBe('connect via the portal')
    expect(result.copyValue).toBe('connect via the portal')
    expect(result.protocolTag).toBeUndefined()
  })

  test('raw without text yields an empty value', () => {
    const result = formatEndpoint(endpoint({ kind: ExposeKind.RAW }), 0, 1)
    expect(result.value).toBe('')
    expect(result.protocolTag).toBeUndefined()
  })
})

describe('formatEndpoint label', () => {
  test('single untitled endpoint is labelled "Endpoint"', () => {
    expect(formatEndpoint(endpoint({ kind: ExposeKind.TCP }), 0, 1).label).toBe(
      'Endpoint'
    )
  })

  test('multiple untitled endpoints are numbered from 1', () => {
    expect(formatEndpoint(endpoint({ kind: ExposeKind.TCP }), 0, 2).label).toBe(
      'Endpoint 1'
    )
    expect(formatEndpoint(endpoint({ kind: ExposeKind.TCP }), 1, 2).label).toBe(
      'Endpoint 2'
    )
  })

  test('a provided title wins regardless of index or count', () => {
    expect(
      formatEndpoint(endpoint({ kind: ExposeKind.TCP, title: 'SSH' }), 1, 3)
        .label
    ).toBe('SSH')
    expect(
      formatEndpoint(endpoint({ kind: ExposeKind.TCP, title: 'SSH' }), 0, 1)
        .label
    ).toBe('SSH')
  })
})

describe('instancePollInterval', () => {
  // [status, expected interval]
  const cases: [InstanceStatus | undefined, number | false][] = [
    [InstanceStatus.STARTING, 2000],
    [InstanceStatus.STOPPING, 2000],
    [InstanceStatus.RUNNING, 10000],
    [InstanceStatus.ERRORED, 10000],
    [InstanceStatus.STOPPED, false],
    [undefined, false],
  ]

  test.each(cases)('%p -> %p', (status, expected) => {
    expect(instancePollInterval(status)).toBe(expected)
  })
})
