import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  discoverLocalTargets,
  localTargetToInstance,
  localizePublicUrlRule,
  normalizeLocalTarget,
} from '../src/local-target'

describe('Docker Compose target discovery', () => {
  test('discovers normalized published TCP ports', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-target-'))
    const configPath = join(directory, 'bot.ts')
    await writeFile(configPath, '')
    await writeFile(join(directory, 'docker-compose.yml'), '')

    const readConfig = async () => ({
      services: {
        web: {
          ports: [
            { target: 8000, published: '8092', protocol: 'tcp' },
            { target: 8001, protocol: 'tcp' },
          ],
        },
        api: {
          ports: [
            {
              target: 3000,
              published: '8080',
              host_ip: '127.0.0.1',
              protocol: 'tcp',
            },
          ],
        },
        dns: {
          ports: [{ target: 53, published: '5353', protocol: 'udp' }],
        },
      },
    })

    expect(
      await discoverLocalTargets(configPath, { cwd: directory, readConfig })
    ).toEqual([
      { url: 'http://localhost:8092/', service: 'web', containerPort: 8000 },
      { url: 'http://127.0.0.1:8080/', service: 'api', containerPort: 3000 },
    ])
  })

  test('includes Compose projects one directory below each search root', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-target-'))
    const configPath = join(directory, 'bot.ts')
    const web = join(directory, 'web')
    const api = join(directory, 'api')
    const nested = join(web, 'nested')
    await mkdir(nested, { recursive: true })
    await mkdir(api)
    await writeFile(configPath, '')
    await writeFile(join(web, 'compose.yml'), '')
    await writeFile(join(api, 'compose.yaml'), '')
    await writeFile(join(nested, 'compose.yml'), '')

    const configs = new Map<string, unknown>([
      [
        web,
        {
          services: {
            web: { ports: [{ target: 3000, published: '8080' }] },
          },
        },
      ],
      [
        api,
        {
          services: {
            api: { ports: [{ target: 4000, published: '9090' }] },
          },
        },
      ],
      [
        nested,
        {
          services: {
            nested: { ports: [{ target: 5000, published: '10000' }] },
          },
        },
      ],
    ])

    expect(
      await discoverLocalTargets(configPath, {
        cwd: directory,
        readConfig: async composeDirectory => configs.get(composeDirectory),
      })
    ).toEqual([
      { url: 'http://localhost:9090/', service: 'api', containerPort: 4000 },
      { url: 'http://localhost:8080/', service: 'web', containerPort: 3000 },
    ])
  })

  test('reports Compose errors when a reporter is provided', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-target-'))
    const configPath = join(directory, 'bot.ts')
    await writeFile(configPath, '')
    await writeFile(join(directory, 'compose.yml'), '')
    const errors: string[] = []

    expect(
      await discoverLocalTargets(configPath, {
        cwd: directory,
        readConfig: async (composeDirectory, reportError) => {
          reportError?.(`Invalid Compose config in ${composeDirectory}`)
          return undefined
        },
        reportComposeError: error => errors.push(error),
      })
    ).toEqual([])
    expect(errors).toEqual([`Invalid Compose config in ${directory}`])
  })
})

describe('local URL input rules', () => {
  test('allows any origin while preserving the path rule', () => {
    const localized = localizePublicUrlRule({
      pattern: '^https://challenge-[a-f0-9]+\\.example/notes/.*$',
    })
    expect(localized).toEqual({
      pattern: '^https?://[^\\/?#\\\\]+/notes/.*$',
    })
    const expression = new RegExp(localized.pattern, localized.flags)
    expect(expression.test('https://challenge-a1.example/notes/1')).toBe(true)
    expect(expression.test('http://localhost:8092/notes/1')).toBe(true)
    expect(expression.test('http://127.0.0.1/notes/1')).toBe(true)
    expect(expression.test('https://[::1]:443/notes/1')).toBe(true)
    expect(expression.test('https://example.com/admin/1')).toBe(false)
    expect(expression.test('https://example.com\\ignored/notes/1')).toBe(false)
  })

  test('replaces host classes and existing local origins', () => {
    const localized = localizePublicUrlRule({
      pattern: '^https://[a-z0-9.-]+/notes/.*$',
    })
    expect(localized).toEqual({
      pattern: '^https?://[^\\/?#\\\\]+/notes/.*$',
    })
    const expression = new RegExp(localized.pattern, localized.flags)
    expect(expression.test('http://localhost:8092/notes/1')).toBe(true)
    expect(
      localizePublicUrlRule({ pattern: '^https://localhost:\\d+/review/.*$' })
    ).toEqual({ pattern: '^https?://[^\\/?#\\\\]+/review/.*$' })
    expect(
      localizePublicUrlRule({ pattern: '^https://challenge.example/notes$' })
    ).toEqual({ pattern: '^https?://[^\\/?#\\\\]+/notes$' })
  })

  test('supports escaped URL delimiters', () => {
    expect(
      localizePublicUrlRule({
        pattern: '^https:\\/\\/challenge\\.example\\/.*$',
        flags: 'i',
      })
    ).toEqual({
      pattern: '^https?:\\/\\/[^\\/?#\\\\]+\\/.*$',
      flags: 'i',
    })
  })

  test('localizes rules that use the unicode and unicodeSets flags', () => {
    for (const flags of ['u', 'v']) {
      const localized = localizePublicUrlRule({
        pattern: '^https://challenge\\.example/notes$',
        flags,
      })
      expect(localized).toEqual({
        pattern: '^https?://[^\\/?#\\\\]+/notes$',
        flags,
      })
      const expression = new RegExp(localized.pattern, localized.flags)
      expect(expression.test('http://localhost:8092/notes')).toBe(true)
      expect(expression.test('http://localhost:8092/admin')).toBe(false)
    }
  })

  test('leaves non-URL rules unchanged', () => {
    const uuid = {
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      flags: 'i',
    }
    const path = { pattern: '^/review/[0-9]+$' }

    expect(localizePublicUrlRule(uuid)).toBe(uuid)
    expect(localizePublicUrlRule(path)).toBe(path)
  })

  test('keeps an unrestricted URL suffix unrestricted', () => {
    const localized = localizePublicUrlRule({ pattern: '^https?://.*$' })
    expect(localized).toEqual({ pattern: '^https?://[^\\/?#\\\\]+.*$' })

    const expression = new RegExp(localized.pattern)
    expect(expression.test('http://localhost:3000')).toBe(true)
    expect(expression.test('https://example.com/any/path?query=1')).toBe(true)
  })

  test('handles URL rules without a path', () => {
    expect(
      localizePublicUrlRule({ pattern: '^(https://challenge\\.example)$' })
    ).toEqual({
      pattern: '^(https?://[^\\/?#\\\\]+)$',
    })
  })

  test('preserves grouped path expressions and backreferences', () => {
    const grouped = localizePublicUrlRule({
      pattern: '^https://challenge\\.example(?:/notes|/admin)$',
    })
    expect(grouped.pattern).toBe('^https?://[^\\/?#\\\\]+(?:/notes|/admin)$')
    expect(() => new RegExp(grouped.pattern)).not.toThrow()

    const backreference = localizePublicUrlRule({
      pattern: '^https://challenge\\.example/([a-z]+)/\\1$',
    })
    const expression = new RegExp(backreference.pattern)
    expect(expression.test('http://localhost:8080/notes/notes')).toBe(true)
    expect(expression.test('http://localhost:8080/notes/admin')).toBe(false)

    const numberedAfterOriginCapture = localizePublicUrlRule({
      pattern: '^https://(sub)\\.example/([a-z]+)/\\2$',
    })
    const numberedExpression = new RegExp(numberedAfterOriginCapture.pattern)
    expect(numberedExpression.test('http://example.com/notes/notes')).toBe(true)
    expect(numberedExpression.test('http://example.com/notes/admin')).toBe(
      false
    )
  })

  test('handles origin alternatives and captures', () => {
    const alternatives = {
      pattern: '^(https://a\\.example|https://b\\.example)/notes$',
    }
    const capturedAuthority = {
      pattern: '^https://(a|b)\\.example/notes$',
    }

    expect(localizePublicUrlRule(alternatives)).toEqual({
      pattern: '^(https?://[^\\/?#\\\\]+|https?://[^\\/?#\\\\]+)/notes$',
    })
    expect(localizePublicUrlRule(capturedAuthority)).toEqual({
      pattern: '^https?://[^\\/?#\\\\]+/notes$',
    })
  })

  test('leaves grouped partial authorities unchanged', () => {
    const rule = {
      pattern: '^(https://a|https://b)\\.example/notes$',
    }

    expect(localizePublicUrlRule(rule)).toBe(rule)
  })

  test('preserves character-class path delimiters', () => {
    expect(
      localizePublicUrlRule({
        pattern: '^https://a\\.example[/?]notes$',
      })
    ).toEqual({ pattern: '^https?://[^\\/?#\\\\]+[/?]notes$' })
  })

  test('leaves origin-dependent path backreferences unchanged', () => {
    const originBackreference = {
      pattern: '^https://(a|b)\\.example/\\1$',
    }

    expect(localizePublicUrlRule(originBackreference)).toBe(originBackreference)
  })
})

describe('local instance metadata', () => {
  const target = normalizeLocalTarget('http://localhost:8092')

  test('normalizes HTTP and HTTPS targets', () => {
    expect(normalizeLocalTarget('https://LOCALHOST/review#form')).toEqual({
      url: 'https://localhost/review',
    })
    expect(normalizeLocalTarget('http://localhost:8092')).toEqual({
      url: 'http://localhost:8092/',
    })
  })

  test('rejects targets that are not HTTP or HTTPS', () => {
    for (const value of [
      'ftp://localhost:8092',
      'javascript:alert(1)',
      'file:///tmp/target',
    ]) {
      expect(() => normalizeLocalTarget(value)).toThrow('http:// or https://')
    }
  })

  test('converts the target to instance metadata', () => {
    expect(localTargetToInstance({ ...target, service: 'web' })).toEqual({
      type: 'http',
      host: 'localhost',
      port: 8092,
      title: 'web',
    })
  })

  test('uses HTTPS instance metadata and its default port', () => {
    expect(
      localTargetToInstance(normalizeLocalTarget('https://localhost/review'))
    ).toEqual({
      type: 'https',
      host: 'localhost',
      port: 443,
    })
    expect(
      localTargetToInstance(normalizeLocalTarget('https://localhost:8443'))
    ).toEqual({
      type: 'https',
      host: 'localhost',
      port: 8443,
    })
  })
})
