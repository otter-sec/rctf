import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  dockerDisplayConnectionError,
  dockerDisplayArguments,
  prepareDockerDisplay,
} from '../src/docker-display'

const existing =
  (...paths: string[]) =>
  (path: string): boolean =>
    paths.includes(path)

const xauthorityRecord = (number: string, data: Buffer): Buffer => {
  const fields = [
    Buffer.from('host'),
    Buffer.from(number),
    Buffer.from('MIT-MAGIC-COOKIE-1'),
    data,
  ]
  return Buffer.concat([
    Buffer.from([0, 0]),
    ...fields.flatMap(value => {
      const length = Buffer.alloc(2)
      length.writeUInt16BE(value.length)
      return [length, value]
    }),
  ])
}

const wildcardRecord = (record: Buffer): Buffer => {
  const result = Buffer.from(record)
  result.writeUInt16BE(0xffff)
  return result
}

describe('Docker display forwarding', () => {
  test('forwards WSLg display sockets', () => {
    expect(
      dockerDisplayArguments({
        platform: 'linux',
        environment: {
          DISPLAY: ':0',
        },
        pathExists: existing('/mnt/wslg', '/tmp/.X11-unix'),
      })
    ).toEqual([
      '--mount',
      'type=bind,src=/tmp/.X11-unix,dst=/tmp/.X11-unix,readonly',
      '--env',
      'DISPLAY=:0',
    ])
  })

  test('forwards native Linux X11 and Xauthority', () => {
    expect(
      dockerDisplayArguments({
        platform: 'linux',
        environment: { DISPLAY: ':1' },
        pathExists: existing('/tmp/.X11-unix'),
        xauthorityPath: '/tmp/prepared-xauthority',
      })
    ).toEqual([
      '--mount',
      'type=bind,src=/tmp/.X11-unix,dst=/tmp/.X11-unix,readonly',
      '--env',
      'DISPLAY=:1',
      '--mount',
      'type=bind,src=/tmp/prepared-xauthority,dst=/tmp/rctf-admin-bot.Xauthority,readonly',
      '--env',
      'XAUTHORITY=/tmp/rctf-admin-bot.Xauthority',
    ])
  })

  test('uses XQuartz through Docker Desktop on macOS', () => {
    expect(
      dockerDisplayArguments({
        platform: 'darwin',
        environment: {
          DISPLAY: '/private/tmp/com.apple.launchd.example/org.xquartz:2',
        },
      })
    ).toEqual(['--env', 'DISPLAY=host.docker.internal:2'])
  })

  test('uses a host X server through Docker Desktop on Windows', () => {
    expect(
      dockerDisplayArguments({ platform: 'win32', environment: {} })
    ).toEqual(['--env', 'DISPLAY=host.docker.internal:0.0'])
    expect(
      dockerDisplayArguments({
        platform: 'win32',
        environment: { DISPLAY: ':1' },
      })
    ).toEqual(['--env', 'DISPLAY=host.docker.internal:1'])
    expect(
      dockerDisplayArguments({
        platform: 'win32',
        environment: { DISPLAY: '[::1]:2.0' },
      })
    ).toEqual(['--env', 'DISPLAY=host.docker.internal:2.0'])
  })

  test('allows a TCP X server without a local display socket', () => {
    expect(
      dockerDisplayArguments({
        platform: 'linux',
        environment: { DISPLAY: '192.0.2.10:0.0' },
        pathExists: () => false,
      })
    ).toEqual(['--env', 'DISPLAY=192.0.2.10:0.0'])
  })

  test('preserves explicit remote displays', () => {
    expect(
      dockerDisplayArguments({
        platform: 'win32',
        environment: { DISPLAY: '192.0.2.10:4.0' },
      })
    ).toEqual(['--env', 'DISPLAY=192.0.2.10:4.0'])
    expect(
      dockerDisplayArguments({
        platform: 'darwin',
        environment: { DISPLAY: 'xserver.example:5' },
      })
    ).toEqual(['--env', 'DISPLAY=xserver.example:5'])
  })

  test('rejects missing Linux displays and local sockets', () => {
    expect(() =>
      dockerDisplayArguments({
        platform: 'linux',
        environment: {},
        pathExists: () => false,
      })
    ).toThrow('requires DISPLAY')
    expect(() =>
      dockerDisplayArguments({
        platform: 'linux',
        environment: { DISPLAY: ':0' },
        pathExists: () => false,
      })
    ).toThrow('X11 socket')
    expect(() =>
      dockerDisplayArguments({
        platform: 'linux',
        environment: { DISPLAY: 'not-a-display' },
      })
    ).toThrow('Invalid DISPLAY "not-a-display": Cannot parse display')
  })

  test('explains connection failures for each host setup', () => {
    expect(
      dockerDisplayConnectionError('host.docker.internal:0.0', {
        platform: 'win32',
      })
    ).toContain('VcXsrv')
    expect(
      dockerDisplayConnectionError('host.docker.internal:0', {
        platform: 'darwin',
      })
    ).toContain('XQuartz')
    expect(
      dockerDisplayConnectionError(':0', {
        platform: 'linux',
        pathExists: existing('/mnt/wslg'),
      })
    ).toContain('WSLg')
    expect(
      dockerDisplayConnectionError(':1', {
        platform: 'linux',
        pathExists: () => false,
      })
    ).toContain('Xauthority')
    expect(
      dockerDisplayConnectionError('xserver.example:2', {
        platform: 'linux',
        pathExists: () => false,
      })
    ).toContain('firewall')
    expect(
      dockerDisplayConnectionError(':1', {
        platform: 'linux',
        pathExists: () => false,
        probeOutput: 'xdpyinfo: unable to open display ":1"',
      })
    ).toContain('Display probe output:\nxdpyinfo: unable to open display ":1"')
  })

  test('copies only matching cookies into a temporary wildcard Xauthority file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-xauthority-test-'))
    const source = join(directory, 'Xauthority')
    const matchingRecord = xauthorityRecord('10', Buffer.alloc(16, 0xab))
    const unrelatedRecord = xauthorityRecord('11', Buffer.alloc(16, 0xcd))
    await writeFile(source, Buffer.concat([unrelatedRecord, matchingRecord]))

    const prepared = await prepareDockerDisplay({
      platform: 'linux',
      environment: { DISPLAY: 'localhost:10.1', XAUTHORITY: source },
      pathExists: path => path === source,
    })
    const mountValue = prepared.args.find(value =>
      value.includes('dst=/tmp/rctf-admin-bot.Xauthority')
    )!
    const preparedPath = mountValue.match(/src=(.*),dst=/)?.[1]
    expect(preparedPath).toBeDefined()
    expect((await readFile(preparedPath!)).toString('hex')).toBe(
      wildcardRecord(matchingRecord).toString('hex')
    )
    if (process.platform !== 'win32') {
      expect((await stat(preparedPath!)).mode & 0o777).toBe(0o644)
    }

    await prepared.cleanup()
    expect(existsSync(preparedPath!)).toBe(false)
  })
})
