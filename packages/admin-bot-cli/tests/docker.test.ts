import { describe, expect, test } from 'bun:test'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  adminBotImageForVersion,
  cacheHostNetworkSuccess,
  displayProbeContainerArguments,
  hasFreshHostNetworkSuccess,
  inspectInDocker,
  isLocalDockerEndpoint,
  localRunnerContainerArguments,
  missingLocalRunnerEventMessage,
} from '../src/docker'
import { loadCliState, saveInputHistory } from '../src/state'

describe('Docker image version', () => {
  test('matches release images to the CLI package version', () => {
    expect(adminBotImageForVersion('2.4.1')).toBe(
      'ghcr.io/otter-sec/rctf/admin-bot:v2.4.1'
    )
    expect(adminBotImageForVersion('2.4.1-beta.1')).toBe(
      'ghcr.io/otter-sec/rctf/admin-bot:v2.4.1-beta.1'
    )
    expect(adminBotImageForVersion('0.0.0')).toBe(
      'ghcr.io/otter-sec/rctf/admin-bot:v0.0.0'
    )
  })
})

describe('Local runner protocol errors', () => {
  test('explains a missing event before showing runner output', () => {
    const output = '{"type":"inspection"}'

    expect(missingLocalRunnerEventMessage('inspection', output)).toBe(
      `The admin-bot image did not return the expected inspection event.\n\nLocal runner output:\n${output}`
    )
  })

  test('explains a missing event when there is no runner output', () => {
    expect(missingLocalRunnerEventMessage('result', '')).toBe(
      'The admin-bot image did not return the expected result event.'
    )
  })

  test('handles Docker closing stdin before reading the request', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-fake-docker-'))
    const executable = join(
      directory,
      process.platform === 'win32' ? 'docker.cmd' : 'docker'
    )
    await writeFile(
      executable,
      process.platform === 'win32' ? '@exit /b 1\r\n' : '#!/bin/sh\nexit 1\n'
    )
    await chmod(executable, 0o755)

    const previousPath = process.env.PATH
    process.env.PATH = directory
    try {
      await expect(
        inspectInDocker('test-image', 'x'.repeat(1024 * 1024))
      ).rejects.toThrow('Failed to write local runner request')
    } finally {
      if (previousPath === undefined) {
        delete process.env.PATH
      } else {
        process.env.PATH = previousPath
      }
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe('Docker host-network cache', () => {
  test('accepts successful probes for one hour', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-docker-cache-'))
    const now = Date.now()
    await writeFile(
      join(directory, 'state.json'),
      JSON.stringify({
        inputHistory: {
          localTarget: [],
          inputs: { url: ['previous-input'] },
        },
        hostNetworkSuccessAt: now - 30 * 60 * 1000,
      })
    )

    expect(await hasFreshHostNetworkSuccess(directory, now)).toBe(true)
    expect(
      await hasFreshHostNetworkSuccess(directory, now + 31 * 60 * 1000)
    ).toBe(false)
  })

  test('rejects missing, invalid, and future cache entries', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-docker-cache-'))
    const path = join(directory, 'state.json')
    const now = Date.now()

    expect(await hasFreshHostNetworkSuccess(directory, now)).toBe(false)
    await writeFile(path, 'invalid')
    expect(await hasFreshHostNetworkSuccess(directory, now)).toBe(false)
    await writeFile(
      path,
      JSON.stringify({
        inputHistory: { localTarget: [], inputs: {} },
        hostNetworkSuccessAt: now + 1,
      })
    )
    expect(await hasFreshHostNetworkSuccess(directory, now)).toBe(false)
  })

  test('preserves input history when caching a successful probe', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-docker-cache-'))
    await saveInputHistory(directory, {
      localTarget: ['http://localhost:8080'],
      inputs: { url: ['previous-input'] },
    })

    await cacheHostNetworkSuccess(directory, 1234)
    expect(await loadCliState(directory)).toEqual({
      inputHistory: {
        localTarget: ['http://localhost:8080'],
        inputs: { url: ['previous-input'] },
      },
      hostNetworkSuccessAt: 1234,
    })
  })
})

describe('Docker endpoint detection', () => {
  test('accepts local Docker transports', () => {
    expect(isLocalDockerEndpoint('unix:///var/run/docker.sock')).toBe(true)
    expect(isLocalDockerEndpoint('npipe:////./pipe/docker_engine')).toBe(true)
    expect(isLocalDockerEndpoint('tcp://127.0.0.1:2375')).toBe(true)
    expect(isLocalDockerEndpoint('tcp://[::1]:2375')).toBe(true)
  })

  test('rejects remote and malformed Docker endpoints', () => {
    expect(isLocalDockerEndpoint('ssh://builder.example')).toBe(false)
    expect(isLocalDockerEndpoint('tcp://192.0.2.10:2375')).toBe(false)
    expect(isLocalDockerEndpoint('not-an-endpoint')).toBe(false)
  })
})

describe('Docker run arguments', () => {
  test('checks the display with a real X11 client', () => {
    const args = displayProbeContainerArguments('rctf-admin-bot:local', [
      '--env',
      'DISPLAY=:0',
    ])

    expect(args).toContain('DISPLAY=:0')
    expect(args).not.toContain('bun')
    expect(args.slice(-5)).toEqual([
      '--entrypoint',
      '/usr/bin/timeout',
      'rctf-admin-bot:local',
      '3s',
      '/usr/bin/xdpyinfo',
    ])
  })

  test('matches production settings and invokes the local runner', () => {
    const args = localRunnerContainerArguments(
      'rctf-admin-bot:local',
      ['--env', 'DISPLAY=:0'],
      'test-runner'
    )

    expect(args).toContain('test-runner')
    expect(args).toContain('--network')
    expect(args).toContain('host')
    expect(args).toContain('--read-only')
    expect(args).toContain('no-new-privileges:true')
    expect(args).toContain('--cap-drop')
    expect(args).toContain('ALL')
    expect(args).toContain('--shm-size')
    expect(args).toContain('512m')
    expect(args).toContain('--cpus')
    expect(args).toContain('2')
    expect(args).toContain('--memory')
    expect(args).toContain('3g')
    expect(args).toContain('--pids-limit')
    expect(args).toContain('1024')
    expect(args).not.toContain('--tty')
    expect(args).toContain('DISPLAY=:0')
    expect(args.slice(-3)).toEqual([
      'rctf-admin-bot:local',
      'bun',
      '/app/dist/local-runner.js',
    ])
  })
})
