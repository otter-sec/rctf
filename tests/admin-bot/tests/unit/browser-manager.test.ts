import { describe, expect, test } from 'bun:test'
import {
  BrowserManager,
  buildLaunchConfiguration,
  sanitizeBrowserArguments,
  type BrowserLaunchOptions,
} from '../../../../apps/admin-bot/src/browser/manager'
import type {
  EgressProxy,
  EgressSession,
} from '../../../../apps/admin-bot/src/browser/egress-proxy'

const options = (
  browser: 'chrome' | 'firefox',
  overrides: Partial<BrowserLaunchOptions> = {}
): BrowserLaunchOptions => ({
  version: { browser, version: 'stable' },
  timeoutMilliseconds: 10_000,
  ...overrides,
})

describe('browser egress launch configuration', () => {
  test('removes reserved switches by name, including separate values', () => {
    expect(
      sanitizeBrowserArguments([
        '--keep=value',
        '--proxy-server=http://attacker:1',
        '--proxy-pac-url',
        'data:attacker',
        '--enable-quic',
        '--force-webrtc-ip-handling-policy=default',
        '--another',
      ])
    ).toEqual(['--keep=value', '--another'])
  })

  test('forces Chrome proxy and bypass controls after challenge options', () => {
    const config = buildLaunchConfiguration(
      options('chrome', {
        arguments: [
          '--proxy-server=http://attacker:1',
          '--proxy-bypass-list=*',
          '--enable-quic',
          '--custom-flag',
        ],
        puppeteerLaunchOptionsExtra: {
          args: ['--from-extra'],
          executablePath: '/attacker/browser',
          headless: false,
          userDataDir: '/runner/profile',
        },
      }),
      '/runner/browser',
      43123
    )

    expect(config.executablePath).toBe('/runner/browser')
    expect(config.headless).toBe(true)
    expect(config.userDataDir).toBe('/runner/profile')
    expect(config.args).toEqual([
      '--custom-flag',
      '--proxy-server=http://127.0.0.1:43123',
      '--proxy-bypass-list=<-loopback>',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--disable-quic',
    ])
    expect(JSON.stringify(config)).not.toContain('proxy-pac')
  })

  test('forces Firefox proxy, fail-closed, and protocol preferences last', () => {
    const config = buildLaunchConfiguration(
      options('firefox', {
        extraPrefsFirefox: {
          'network.proxy.type': 0,
          'network.proxy.no_proxies_on': 'localhost',
          'network.proxy.failover_direct': true,
          'media.peerconnection.enabled': true,
          'network.http.http3.enable': true,
          'network.webtransport.enabled': true,
          'challenge.preference': true,
        },
        puppeteerLaunchOptionsExtra: {
          extraPrefsFirefox: { attacker: true },
        },
      }),
      '/runner/firefox',
      43124
    )
    const prefs = config.extraPrefsFirefox!

    expect(prefs['challenge.preference']).toBe(true)
    expect(prefs['network.proxy.type']).toBe(1)
    expect(prefs['network.proxy.http']).toBe('127.0.0.1')
    expect(prefs['network.proxy.http_port']).toBe(43124)
    expect(prefs['network.proxy.ssl_port']).toBe(43124)
    expect(prefs['network.proxy.no_proxies_on']).toBe('')
    expect(prefs['network.proxy.failover_direct']).toBe(false)
    expect(prefs['network.proxy.allow_bypass']).toBe(false)
    expect(prefs['media.peerconnection.enabled']).toBe(false)
    expect(prefs['network.http.http3.enable']).toBe(false)
    expect(prefs['network.webtransport.enabled']).toBe(false)
    expect(prefs).not.toHaveProperty('attacker')
    expect(JSON.stringify(prefs)).not.toContain('autoconfig_url')
  })

  test('managed close is idempotent and starts session closure', async () => {
    let sessionCloseCalls = 0
    const session = {
      id: 'test-session',
      port: 43125,
      stats: {},
      close: () => {
        sessionCloseCalls++
        return Promise.resolve()
      },
      on: () => session,
    } as EgressSession
    const proxy = {
      openSession: async () => session,
    } as unknown as EgressProxy
    const manager = new BrowserManager(undefined, proxy)

    const managed = await manager.launchBrowser(options('chrome'))
    const firstClose = managed.close()
    expect(managed.close()).toBe(firstClose)
    expect(sessionCloseCalls).toBe(1)
    await firstClose
  })

  test('closes the session when Puppeteer launch fails', async () => {
    let sessionCloseCalls = 0
    const session = {
      id: 'failed-launch-session',
      port: 43126,
      stats: {},
      close: async () => {
        sessionCloseCalls++
      },
      on: () => session,
    } as unknown as EgressSession
    const proxy = {
      openSession: async () => session,
    } as unknown as EgressProxy
    const manager = new BrowserManager(undefined, proxy)
    ;(globalThis as Record<string, unknown>).__rctfAdminBotLaunchOverride =
      async () => {
        throw new Error('launch failure')
      }

    try {
      await expect(manager.launchBrowser(options('chrome'))).rejects.toThrow(
        'launch failure'
      )
    } finally {
      delete (globalThis as Record<string, unknown>)
        .__rctfAdminBotLaunchOverride
    }
    expect(sessionCloseCalls).toBe(1)
  })
})
