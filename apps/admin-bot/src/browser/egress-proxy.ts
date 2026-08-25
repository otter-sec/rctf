import { randomUUID } from 'node:crypto'
import { lookup as dnsLookup } from 'node:dns/promises'
import { EventEmitter, once } from 'node:events'
import http, {
  type IncomingHttpHeaders,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type ServerResponse,
} from 'node:http'
import net, { type Socket } from 'node:net'
import {
  canonicalizeHostname,
  DomainPolicy,
  IpPolicy,
  type RestrictedDomainsConfig,
} from '../core/egress-policy'
import { createLogger } from '../core/logger'

const logger = createLogger('egress-proxy')
const CONNECT_TIMEOUT_MS = 15_000
const HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

export interface LookupAddress {
  address: string
  family: 4 | 6
}

export type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<readonly LookupAddress[]>

export interface EgressProxyOptions {
  allowPrivateCidrs?: string[]
  denyCidrs?: string[]
  lookup?: LookupFn
}

export interface EgressSessionOptions {
  restrictedDomains?: RestrictedDomainsConfig
  idleTimeoutMs: number
}

export interface EgressStats {
  sessionsOpened: number
  sessionsClosed: number
  requests: number
  httpRequests: number
  connectRequests: number
  allowed: number
  denied: number
  errors: number
  dnsLookups: number
  connections: number
}

export interface EgressDecision {
  action: 'allow' | 'deny' | 'error'
  reason: string
  host: string
  port: number
  sessionId: string
}

export interface EgressSession extends EventEmitter {
  readonly id: string
  readonly port: number
  readonly stats: EgressStats
  close(): Promise<void>
  on(event: 'decision', listener: (decision: EgressDecision) => void): this
}

type StatsKey = keyof EgressStats
type Status = 400 | 403 | 502
type Address = LookupAddress & { reason: string }
type Target = { hostname: string; port: number; policyUrl: string }

const newStats = (): EgressStats => ({
  sessionsOpened: 0,
  sessionsClosed: 0,
  requests: 0,
  httpRequests: 0,
  connectRequests: 0,
  allowed: 0,
  denied: 0,
  errors: 0,
  dnsLookups: 0,
  connections: 0,
})

const stripHeaders = (headers: IncomingHttpHeaders): OutgoingHttpHeaders => {
  const nominated = new Set(
    String(headers.connection ?? '')
      .split(',')
      .map(name => name.trim().toLowerCase())
      .filter(Boolean)
  )
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name, value]) =>
        value !== undefined &&
        !HOP_HEADERS.has(name.toLowerCase()) &&
        !nominated.has(name.toLowerCase())
    )
  )
}

const authority = (hostname: string, port?: number) =>
  `${net.isIPv6(hostname) ? `[${hostname}]` : hostname}${port ? `:${port}` : ''}`

const respond = (target: ServerResponse | Socket, status: Status): void => {
  if ('writeHead' in target) {
    if (!target.headersSent) target.writeHead(status, { 'content-length': '0' })
    target.end()
    return
  }

  const text = { 400: 'Bad Request', 403: 'Forbidden', 502: 'Bad Gateway' }[
    status
  ]
  target.end(
    `HTTP/1.1 ${status} ${text}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`
  )
}

const parseHttpTarget = (
  requestUrl?: string
): Target & { hostHeader: string; path: string } => {
  if (!requestUrl) throw new Error('missing URL')
  const url = new URL(requestUrl)
  if (url.protocol !== 'http:' || url.username || url.password || url.hash) {
    throw new Error('invalid URL')
  }

  const hostname = canonicalizeHostname(url.hostname)
  const port = url.port ? Number(url.port) : 80
  const hostHeader = authority(hostname, url.port ? port : undefined)
  const path = `${url.pathname}${url.search}`
  return {
    hostname,
    port,
    hostHeader,
    path,
    policyUrl: `http://${hostHeader}${path}`,
  }
}

const parseConnectTarget = (requestUrl?: string): Target => {
  const match =
    /^\[([^\]]+)\]:(\d+)$/.exec(requestUrl ?? '') ??
    /^([^:[\]@]+):(\d+)$/.exec(requestUrl ?? '')
  const port = Number(match?.[2])
  if (!match || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('invalid CONNECT authority')
  }

  const hostname = canonicalizeHostname(match[1]!)
  return {
    hostname,
    port,
    policyUrl: `https://${authority(hostname, port)}/`,
  }
}

class SessionClosed extends Error {}
class Rejected extends Error {
  constructor(
    readonly status: 403 | 502,
    readonly reason: string
  ) {
    super(reason)
  }
}

class ProxySession extends EventEmitter implements EgressSession {
  readonly id = randomUUID()
  private readonly server: http.Server
  private readonly domainPolicy: DomainPolicy
  private readonly sockets = new Set<Socket>()
  private readonly values = newStats()
  private listenerPort = 0
  private closed = false
  private startPromise?: Promise<void>
  private closePromise?: Promise<void>

  constructor(
    options: EgressSessionOptions,
    private readonly ipPolicy: IpPolicy,
    private readonly lookup: LookupFn,
    private readonly aggregate: EgressStats,
    private readonly onClosed: (session: ProxySession) => void,
    private readonly onDecision: (decision: EgressDecision) => void
  ) {
    super()
    if (!Number.isFinite(options.idleTimeoutMs) || options.idleTimeoutMs <= 0) {
      throw new Error('idleTimeoutMs must be a positive number')
    }

    this.idleTimeoutMs = options.idleTimeoutMs
    this.domainPolicy = new DomainPolicy(options.restrictedDomains)
    this.values.sessionsOpened = 1
    this.server = http.createServer(
      (req, res) => void this.handleHttp(req, res)
    )
    this.server.on(
      'connect',
      (req, socket, head) =>
        void this.handleConnect(req, socket as Socket, head)
    )
    this.server.on('upgrade', (_req, socket) => {
      this.request('httpRequests')
      this.decide('deny', 'http-upgrade-unsupported', '', 0)
      respond(socket as Socket, 400)
    })
    this.server.on('connection', socket => this.track(socket))
    this.server.on('clientError', (_error, socket) => {
      this.increment('errors')
      respond(socket as Socket, 400)
    })
  }

  private readonly idleTimeoutMs: number

  get port(): number {
    return this.listenerPort
  }

  get stats(): EgressStats {
    return { ...this.values }
  }

  start(): Promise<void> {
    return (this.startPromise ??= (async () => {
      this.server.listen(0, '127.0.0.1')
      await once(this.server, 'listening')
      const address = this.server.address()
      if (!address || typeof address === 'string') {
        throw new Error('Could not determine egress proxy port')
      }
      this.listenerPort = address.port
      this.server.unref()
      this.ensureOpen()
    })())
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.closed = true
    for (const socket of this.sockets) socket.destroy()

    return (this.closePromise = (async () => {
      try {
        await this.startPromise?.catch(() => undefined)
        if (this.server.listening) {
          await new Promise<void>(resolve => this.server.close(() => resolve()))
        }
      } finally {
        this.increment('sessionsClosed')
        this.onClosed(this)
      }
    })())
  }

  private increment(key: StatsKey): void {
    this.values[key]++
    this.aggregate[key]++
  }

  private request(kind: 'httpRequests' | 'connectRequests'): void {
    this.increment('requests')
    this.increment(kind)
  }

  private decide(
    action: EgressDecision['action'],
    reason: string,
    host: string,
    port: number
  ): void {
    this.increment(
      action === 'allow' ? 'allowed' : action === 'deny' ? 'denied' : 'errors'
    )
    const decision = { action, reason, host, port, sessionId: this.id }
    logger.info(decision, 'browser egress decision')
    this.emit('decision', decision)
    this.onDecision(decision)
  }

  private track(socket: Socket): Socket {
    this.sockets.add(socket)
    socket.setTimeout(this.idleTimeoutMs, () => socket.destroy())
    socket.once('close', () => this.sockets.delete(socket))
    return socket
  }

  private ensureOpen(): void {
    if (this.closed) throw new SessionClosed('Egress session is closed')
  }

  private async resolve(hostname: string): Promise<Address> {
    this.ensureOpen()
    let addresses: readonly LookupAddress[]
    if (net.isIP(hostname)) {
      addresses = [{ address: hostname, family: net.isIPv6(hostname) ? 6 : 4 }]
    } else {
      this.increment('dnsLookups')
      try {
        addresses = await this.lookup(hostname, { all: true, verbatim: true })
      } catch {
        this.ensureOpen()
        throw new Rejected(502, 'dns-failure')
      }
      this.ensureOpen()
    }

    if (!addresses.length) throw new Rejected(502, 'dns-failure')
    let first: Address | undefined
    for (const result of addresses) {
      const family = Number(result.family)
      if (
        (family !== 4 && family !== 6) ||
        net.isIP(result.address) !== family
      ) {
        throw new Rejected(403, 'ip-invalid')
      }
      const decision = this.ipPolicy.evaluate(result.address)
      if (decision.action === 'deny') throw new Rejected(403, decision.reason)
      first ??= { address: result.address, family, reason: decision.reason }
    }
    return first!
  }

  private async authorize(target: Target): Promise<Address> {
    const decision = this.domainPolicy.evaluate(
      target.hostname,
      target.policyUrl
    )
    if (decision.action === 'deny') throw new Rejected(403, decision.reason)
    return this.resolve(target.hostname)
  }

  private reject(error: unknown, target: Target): Status | undefined {
    if (error instanceof SessionClosed) return
    const rejected =
      error instanceof Rejected ? error : new Rejected(502, 'dns-failure')
    this.decide(
      rejected.status === 403 ? 'deny' : 'error',
      rejected.reason,
      target.hostname,
      target.port
    )
    return rejected.status
  }

  private async handleHttp(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    this.request('httpRequests')
    let target: ReturnType<typeof parseHttpTarget>
    try {
      target = parseHttpTarget(req.url)
    } catch {
      this.decide('deny', 'http-invalid-target', '', 0)
      return respond(res, 400)
    }

    let address: Address
    try {
      address = await this.authorize(target)
    } catch (error) {
      const status = this.reject(error, target)
      if (status) respond(res, status)
      else res.destroy()
      return
    }

    try {
      this.ensureOpen()
      const headers = stripHeaders(req.headers)
      headers.host = target.hostHeader
      const upstream = http.request({
        host: address.address,
        family: address.family,
        port: target.port,
        method: req.method,
        path: target.path,
        headers,
        agent: false,
      })
      upstream.once('socket', socket => this.track(socket))
      let answered = false
      upstream.once('response', response => {
        answered = true
        this.increment('connections')
        res.writeHead(
          response.statusCode ?? 502,
          response.statusMessage ?? '',
          stripHeaders(response.headers)
        )
        response.pipe(res)
      })
      upstream.once('error', error => {
        logger.warn(
          {
            error,
            host: target.hostname,
            port: target.port,
            sessionId: this.id,
          },
          'HTTP upstream failed'
        )
        this.increment('errors')
        if (answered) res.destroy()
        else respond(res, 502)
      })
      req.once('aborted', () => upstream.destroy())
      res.once('close', () => !res.writableEnded && upstream.destroy())
      this.decide('allow', address.reason, target.hostname, target.port)
      req.pipe(upstream)
    } catch {
      res.destroy()
    }
  }

  private async handleConnect(
    req: IncomingMessage,
    client: Socket,
    head: Buffer
  ): Promise<void> {
    this.request('connectRequests')
    client.pause()
    let target: Target
    try {
      target = parseConnectTarget(req.url)
    } catch {
      this.decide('deny', 'connect-invalid-authority', '', 0)
      return respond(client, 400)
    }

    let address: Address
    try {
      address = await this.authorize(target)
    } catch (error) {
      const status = this.reject(error, target)
      if (status) respond(client, status)
      else client.destroy()
      return
    }

    let upstream: Socket
    try {
      this.ensureOpen()
      upstream = this.track(
        net.createConnection({
          host: address.address,
          family: address.family,
          port: target.port,
        })
      )
    } catch {
      client.destroy()
      return
    }

    let established = false
    let closed = false
    const close = (status?: 502) => {
      if (closed) return
      closed = true
      upstream.destroy()
      if (status) respond(client, status)
      else client.destroy()
    }

    upstream.setTimeout(CONNECT_TIMEOUT_MS, () =>
      close(established ? undefined : 502)
    )
    client.once('error', () => close())
    client.once('close', () => close())
    upstream.once('close', () => close())
    upstream.once('error', () => {
      this.increment('errors')
      close(established ? undefined : 502)
    })
    upstream.once('connect', () => {
      if (this.closed) return close()
      established = true
      this.increment('connections')
      upstream.setTimeout(this.idleTimeoutMs, () => close())
      client.setTimeout(this.idleTimeoutMs, () => close())
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      if (head.length) upstream.write(head)
      this.decide('allow', address.reason, target.hostname, target.port)
      client.pipe(upstream)
      upstream.pipe(client)
      client.resume()
    })
  }
}

export class EgressProxy extends EventEmitter {
  private readonly ipPolicy: IpPolicy
  private readonly lookup: LookupFn
  private readonly sessions = new Set<ProxySession>()
  private readonly values = newStats()
  private closed = false
  private closePromise?: Promise<void>

  constructor(options: EgressProxyOptions = {}) {
    super()
    this.ipPolicy = new IpPolicy(options)
    this.lookup = options.lookup ?? (dnsLookup as LookupFn)
  }

  get stats(): EgressStats {
    return { ...this.values }
  }

  async openSession(options: EgressSessionOptions): Promise<EgressSession> {
    if (this.closed) throw new Error('Egress proxy is closed')
    const session = new ProxySession(
      options,
      this.ipPolicy,
      this.lookup,
      this.values,
      closed => this.sessions.delete(closed),
      decision => this.emit('decision', decision)
    )
    this.sessions.add(session)
    this.values.sessionsOpened++
    try {
      await session.start()
      if (this.closed)
        throw new Error('Egress proxy closed while opening a session')
      return session
    } catch (error) {
      await session.close()
      throw error
    }
  }

  closeAllSessions(): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.closed = true
    return (this.closePromise = Promise.all(
      [...this.sessions].map(session => session.close())
    ).then(() => undefined))
  }
}
