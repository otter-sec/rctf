import { describe, test, expect, beforeAll } from 'bun:test'
import {
  runChallenge,
  challengeSource,
  htmlPage,
  browserManager,
} from './helper'

beforeAll(async () => {
  await browserManager.getBrowserPath({ browser: 'chrome', version: 'stable' })
}, 120_000)

describe('lifecycle', () => {
  test('successful handler completes with admin-bot log lines', async () => {
    const url = htmlPage(`<h1>Success</h1>`)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')`,
      }),
    })

    expect(result.success).toBe(true)
    expect(result.parsed.some(l => l.line.includes('setting up browser'))).toBe(
      true
    )
    expect(
      result.parsed.some(l => l.line.includes('running challenge handler'))
    ).toBe(true)
  }, 30_000)

  test('timeout produces failure', async () => {
    const result = await runChallenge({
      source: challengeSource({
        handler: `await new Promise(() => {})`,
        timeout: 200,
      }),
    })

    expect(result.success).toBe(false)
  }, 30_000)

  test('handler error produces failure', async () => {
    const result = await runChallenge({
      source: challengeSource({
        handler: `throw new Error('intentional-test-error')`,
      }),
    })

    expect(result.success).toBe(false)
  }, 30_000)

  test('handler can read job metadata from context', async () => {
    const result = await runChallenge({
      source: challengeSource({
        handler: `
    ctx.output.info('challenge', 'user=' + ctx.job.userId)
    ctx.output.info('challenge', 'flag=' + ctx.job.flag)`,
      }),
    })

    expect(result.success).toBe(true)
    expect(result.parsed.some(l => l.line.includes('user=test-user'))).toBe(
      true
    )
    expect(result.parsed.some(l => l.line.includes('flag=flag{test}'))).toBe(
      true
    )
  }, 30_000)

  test('handler can write to output directly', async () => {
    const result = await runChallenge({
      source: challengeSource({
        handler: `
    ctx.output.info('challenge', 'custom-info-line')
    ctx.output.warn('challenge', 'custom-warn-line')
    ctx.output.error('challenge', 'custom-error-line')`,
      }),
    })

    expect(result.success).toBe(true)
    const custom = result.parsed.filter(l => l.prefix === 'challenge')
    expect(
      custom.some(l => l.line === 'custom-info-line' && l.level === 'info')
    ).toBe(true)
    expect(
      custom.some(l => l.line === 'custom-warn-line' && l.level === 'warn')
    ).toBe(true)
    expect(
      custom.some(l => l.line === 'custom-error-line' && l.level === 'error')
    ).toBe(true)
  }, 30_000)
})
