import proxyAddr from '@fastify/proxy-addr'
import { config } from '@rctf/config'
import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'

// NOTE(es3n1n): We could've used something more elegant,
//   but unfortunately we need backwards compatibility with rctf v1.

function compile(
  value: boolean | string | string[] | number
): (ip: string, i: number) => boolean {
  if (typeof value === 'boolean') {
    return (_ip: string, _i: number) => value
  }
  if (typeof value === 'number') {
    return (_ip: string, i: number) => i < value
  }
  if (typeof value === 'string') {
    return proxyAddr.compile((value as string).split(',').map(it => it.trim()))
  }
  return proxyAddr.compile(value as string[])
}

const trust = compile(config.proxy.trust)

function getForwardedFor(ctx: Context, remoteIp: string | undefined): string[] {
  const header = ctx.req.header('x-forwarded-for')
  let result: string[] = remoteIp ? [remoteIp] : []
  if (!header) {
    return result
  }

  let end = header.length
  let start = header.length

  for (var i = header.length - 1; i >= 0; i--) {
    switch (header.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i
        }
        break
      case 0x2c /* , */:
        if (start !== end) {
          result.push(header.substring(start, end))
        }

        start = end = i
        break
      default:
        start = i
        break
    }
  }

  if (start !== end) {
    result.push(header.substring(start, end))
  }

  return result
}

export function getIp(ctx: Context): string | undefined {
  let remoteIp = getConnInfo(ctx).remote.address
  // FIXME(es3n1n): is there a better way?
  if (remoteIp?.startsWith('::ffff:')) {
    remoteIp = remoteIp.slice(7)
  }

  if (config.proxy.cloudflare) {
    return ctx.req.header('cf-connecting-ip') ?? remoteIp
  }

  const forwardedFor = getForwardedFor(ctx, remoteIp)
  for (let i = 0; i < forwardedFor.length; i++) {
    if (trust(forwardedFor[i]!, i)) {
      continue
    }

    forwardedFor.length = i + 1
  }

  return forwardedFor.length ? forwardedFor[forwardedFor.length - 1]! : remoteIp
}
