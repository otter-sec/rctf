import { afterEach, describe, expect, test } from 'bun:test'
import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import net from 'node:net'
import {
  EgressProxy,
  type EgressDecision,
} from '../../../../apps/admin-bot/src/browser/egress-proxy'

const proxies: EgressProxy[] = []
const servers: Array<http.Server | net.Server> = []

afterEach(async () => {
  await Promise.all(proxies.splice(0).map(proxy => proxy.closeAllSessions()))
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>(resolve => {
          server.close(() => resolve())
        })
    )
  )
})

const listenHttp = async (
  handler: (request: IncomingMessage, response: ServerResponse) => void
) => {
  const server = http.createServer(handler)
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as net.AddressInfo).port
}

const proxyRequest = async (
  proxyPort: number,
  target: string,
  headers: Record<string, string> = {}
): Promise<{
  status: number
  body: string
  headers: IncomingMessage['headers']
}> =>
  new Promise(resolve => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port: proxyPort,
        method: 'GET',
        path: target,
        headers,
      },
      response => {
        let body = ''
        response.on('data', chunk => (body += chunk))
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body,
            headers: response.headers,
          })
        )
      }
    )
    request.on('error', () => resolve({ status: 0, body: '', headers: {} }))
    request.end()
  })

const connect = async (proxyPort: number, authority: string, head = '') =>
  new Promise<string>(resolve => {
    const socket = net.connect(proxyPort, '127.0.0.1', () => {
      socket.write(
        `CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n${head}`
      )
    })
    let response = ''
    socket.on('data', chunk => (response += chunk))
    socket.on('error', () => resolve(response))
    socket.on('close', () => resolve(response))
  })

const rawHttp = async (proxyPort: number, target: string) =>
  new Promise<string>(resolve => {
    const socket = net.connect(proxyPort, '127.0.0.1', () => {
      socket.write(
        `GET ${target} HTTP/1.1\r\nHost: proxy.test\r\nConnection: close\r\n\r\n`
      )
    })
    let response = ''
    socket.on('data', chunk => (response += chunk))
    socket.on('error', () => resolve(response))
    socket.on('close', () => resolve(response))
  })

const localProxy = () => {
  const proxy = new EgressProxy({
    allowPrivateCidrs: ['127.0.0.0/8'],
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  })
  proxies.push(proxy)
  return proxy
}

describe('EgressProxy HTTP', () => {
  test('pins vetted DNS, canonicalizes Host and URL, and strips hop headers', async () => {
    let receivedHeaders: IncomingMessage['headers'] = {}
    const originPort = await listenHttp((request, response) => {
      receivedHeaders = request.headers
      response.setHeader('connection', 'x-response-secret')
      response.setHeader('x-response-secret', 'remove-me')
      response.setHeader('x-visible', 'yes')
      response.end('ok')
    })
    const proxy = localProxy()
    const session = await proxy.openSession({
      idleTimeoutMs: 5_000,
      restrictedDomains: {
        url: {
          allowRegex: [{ pattern: '^http://example\\.test:' }],
          disallowRegex: [{ pattern: '.*' }],
        },
      },
    })

    const response = await proxyRequest(
      session.port,
      `http://ExAmPlE.TeSt.:${originPort}/path?q=1`,
      {
        host: 'attacker.invalid',
        connection: 'x-request-secret',
        'x-request-secret': 'remove-me',
        'x-visible': 'yes',
      }
    )

    expect(response.status).toBe(200)
    expect(response.body).toBe('ok')
    expect(receivedHeaders.host).toBe(`example.test:${originPort}`)
    expect(receivedHeaders['x-request-secret']).toBeUndefined()
    expect(receivedHeaders['x-visible']).toBe('yes')
    expect(response.headers['x-response-secret']).toBeUndefined()
    expect(response.headers['x-visible']).toBe('yes')
  })

  test('returns empty 403 for domain, denied IP, and mixed DNS answers', async () => {
    let hits = 0
    const originPort = await listenHttp((_request, response) => {
      hits++
      response.end('hit')
    })

    let lookups = 0
    const proxy = new EgressProxy({
      lookup: async hostname => {
        lookups++
        if (hostname === 'mixed.test') {
          return [
            { address: '8.8.8.8', family: 4 },
            { address: '127.0.0.1', family: 4 },
          ]
        }
        return [{ address: '127.0.0.1', family: 4 }]
      },
    })
    proxies.push(proxy)
    const session = await proxy.openSession({
      idleTimeoutMs: 5_000,
      restrictedDomains: {
        host: { disallowRegex: [{ pattern: '^domain-denied\\.test$' }] },
      },
    })

    const domainDenied = await proxyRequest(
      session.port,
      `http://domain-denied.test:${originPort}/secret`
    )
    const ipDenied = await proxyRequest(
      session.port,
      `http://ip-denied.test:${originPort}/secret`
    )
    const mixedDenied = await proxyRequest(
      session.port,
      `http://mixed.test:${originPort}/secret`
    )

    expect(domainDenied).toMatchObject({ status: 403, body: '' })
    expect(ipDenied).toMatchObject({ status: 403, body: '' })
    expect(mixedDenied).toMatchObject({ status: 403, body: '' })
    expect(lookups).toBe(2)
    expect(hits).toBe(0)
  })

  test('resolves every request and blocks a rebinding answer', async () => {
    let hits = 0
    const originPort = await listenHttp((_request, response) => {
      hits++
      response.end('ok')
    })
    let lookupCount = 0
    const proxy = new EgressProxy({
      allowPrivateCidrs: ['127.0.0.0/8'],
      lookup: async () => {
        lookupCount++
        return lookupCount === 1
          ? [{ address: '127.0.0.1', family: 4 }]
          : [{ address: '10.0.0.1', family: 4 }]
      },
    })
    proxies.push(proxy)
    const session = await proxy.openSession({ idleTimeoutMs: 5_000 })

    expect(
      (await proxyRequest(session.port, `http://rebind.test:${originPort}/`))
        .status
    ).toBe(200)
    expect(
      (await proxyRequest(session.port, `http://rebind.test:${originPort}/`))
        .status
    ).toBe(403)
    expect(lookupCount).toBe(2)
    expect(hits).toBe(1)
  })

  test('rejects origin form, credentials, unsupported schemes, and unusual loopback syntax', async () => {
    const proxy = new EgressProxy()
    proxies.push(proxy)
    const session = await proxy.openSession({ idleTimeoutMs: 5_000 })

    expect((await proxyRequest(session.port, '/origin-form')).status).toBe(400)
    expect(
      await rawHttp(session.port, 'http://user:pass@example.test/')
    ).toContain('400 Bad Request')
    expect(await rawHttp(session.port, 'https://example.test/file')).toContain(
      '400 Bad Request'
    )
    expect(
      (await proxyRequest(session.port, 'http://2130706433/')).status
    ).toBe(403)
  })
})

describe('EgressProxy CONNECT and lifecycle', () => {
  test('preserves the CONNECT head and tears tunnels down with the session', async () => {
    let received = ''
    const origin = net.createServer(socket => {
      socket.on('data', chunk => {
        received += chunk
        socket.write('origin-response')
      })
    })
    servers.push(origin)
    await new Promise<void>(resolve => origin.listen(0, '127.0.0.1', resolve))
    const originPort = (origin.address() as net.AddressInfo).port
    const proxy = localProxy()
    const session = await proxy.openSession({ idleTimeoutMs: 5_000 })

    const responsePromise = connect(
      session.port,
      `head.test:${originPort}`,
      'buffered-head'
    )
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(received).toBe('buffered-head')
    await session.close()
    expect(await responsePromise).toContain('200 Connection Established')
  })

  test('strictly rejects invalid CONNECT authorities and ports', async () => {
    const proxy = localProxy()
    const session = await proxy.openSession({ idleTimeoutMs: 5_000 })

    expect(await connect(session.port, 'example.test')).toContain(
      '400 Bad Request'
    )
    expect(await connect(session.port, 'example.test:0')).toContain(
      '400 Bad Request'
    )
    expect(await connect(session.port, 'example.test:65536')).toContain(
      '400 Bad Request'
    )
    expect(await connect(session.port, '[fe80::1%25eth0]:443')).toContain(
      '400 Bad Request'
    )
  })

  test('returns 502 when an allowed CONNECT upstream fails', async () => {
    const proxy = localProxy()
    const session = await proxy.openSession({ idleTimeoutMs: 5_000 })

    expect(await connect(session.port, 'unavailable.test:1')).toContain(
      '502 Bad Gateway'
    )
  })

  test('rechecks closure after late DNS and never opens the upstream', async () => {
    let finishLookup!: () => void
    let lookupStarted!: () => void
    const started = new Promise<void>(resolve => (lookupStarted = resolve))
    const proxy = new EgressProxy({
      allowPrivateCidrs: ['127.0.0.0/8'],
      lookup: async () => {
        lookupStarted()
        await new Promise<void>(resolve => (finishLookup = resolve))
        return [{ address: '127.0.0.1', family: 4 }]
      },
    })
    proxies.push(proxy)
    const session = await proxy.openSession({ idleTimeoutMs: 5_000 })
    const request = proxyRequest(session.port, 'http://late-dns.test:12345/')

    await started
    const firstClose = session.close()
    expect(session.close()).toBe(firstClose)
    finishLookup()
    await firstClose
    expect((await request).status).toBe(0)
    expect(session.stats.connections).toBe(0)
  })

  test('isolates policies and exposes aggregate/session decisions and counters', async () => {
    const originPort = await listenHttp((_request, response) =>
      response.end('ok')
    )
    const proxy = localProxy()
    const decisions: EgressDecision[] = []
    proxy.on('decision', decision => decisions.push(decision))
    const allowed = await proxy.openSession({ idleTimeoutMs: 5_000 })
    const denied = await proxy.openSession({
      idleTimeoutMs: 5_000,
      restrictedDomains: {
        host: { disallowRegex: [{ pattern: '.*' }] },
      },
    })

    expect(
      (await proxyRequest(allowed.port, `http://same.test:${originPort}/`))
        .status
    ).toBe(200)
    expect(
      (await proxyRequest(denied.port, `http://same.test:${originPort}/`))
        .status
    ).toBe(403)
    expect(allowed.stats.allowed).toBe(1)
    expect(denied.stats.denied).toBe(1)
    expect(proxy.stats.requests).toBe(2)
    expect(proxy.stats.allowed).toBe(1)
    expect(proxy.stats.denied).toBe(1)
    expect(new Set(decisions.map(decision => decision.sessionId)).size).toBe(2)

    await proxy.closeAllSessions()
    expect(proxy.closeAllSessions()).toBe(proxy.closeAllSessions())
    expect(proxy.stats.sessionsClosed).toBe(2)
  })
})
