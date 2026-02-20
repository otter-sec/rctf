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

describe('console hooks', () => {
  test('captures log, error, warn at correct levels', async () => {
    const url = htmlPage(`
      <script>
        setTimeout(() => {
          console.log('msg-log');
          console.error('msg-error');
          console.warn('msg-warn');
        }, 300);
      </script>
    `)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 2000))`,
      }),
    })

    expect(result.success).toBe(true)
    const consoleLogs = result.parsed.filter(l => l.prefix === 'console')
    expect(consoleLogs.length).toBe(3)
    expect(
      consoleLogs.some(l => l.line.includes('msg-log') && l.level === 'info')
    ).toBe(true)
    expect(
      consoleLogs.some(l => l.line.includes('msg-error') && l.level === 'error')
    ).toBe(true)
    expect(
      consoleLogs.some(l => l.line.includes('msg-warn') && l.level === 'warn')
    ).toBe(true)
  }, 30_000)

  test('suppressed when showConsoleLogs is false', async () => {
    const url = htmlPage(`<script>console.log('hidden')</script>`)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 500))`,
        hooksConfig: { showConsoleLogs: false },
      }),
    })

    expect(result.success).toBe(true)
    const consoleLogs = result.parsed.filter(l => l.prefix === 'console')
    expect(consoleLogs.length).toBe(0)
  }, 30_000)
})

describe('navigation hooks', () => {
  test('captures tab created, navigation completed, and tab closed', async () => {
    const url = htmlPage(`<h1>Nav Test</h1>`)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 500))
    await page.close()
    await new Promise(r => setTimeout(r, 200))`,
      }),
    })

    expect(result.success).toBe(true)
    const navLogs = result.parsed.filter(l => l.prefix === 'navigation')
    expect(navLogs.some(l => l.line.includes('tab created'))).toBe(true)
    expect(navLogs.some(l => l.line.includes('navigation completed'))).toBe(
      true
    )
    expect(navLogs.some(l => l.line.includes('tab closed'))).toBe(true)
  }, 30_000)

  test('suppressed when showNavigation is false', async () => {
    const url = htmlPage(`<h1>Hidden Nav</h1>`)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 500))`,
        hooksConfig: { showNavigation: false },
      }),
    })

    expect(result.success).toBe(true)
    const navLogs = result.parsed.filter(
      l =>
        l.prefix === 'navigation' &&
        (l.line.includes('navigation started') ||
          l.line.includes('navigation completed') ||
          l.line.includes('tab closed'))
    )
    expect(navLogs.length).toBe(0)
  }, 30_000)
})

describe('error hooks', () => {
  test('captures uncaught page errors', async () => {
    const url = htmlPage(`
      <script>throw new Error('uncaught-test-error')</script>
    `)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 1000))`,
      }),
    })

    expect(result.success).toBe(true)
    const errorLogs = result.parsed.filter(l => l.line.includes('page error'))
    expect(errorLogs.some(l => l.line.includes('uncaught-test-error'))).toBe(
      true
    )
    expect(errorLogs[0]?.level).toBe('error')
  }, 30_000)

  test('captures failed network requests', async () => {
    const url = htmlPage(`
      <img src="http://localhost:1/nonexistent.png">
    `)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 2000))`,
      }),
    })

    expect(result.success).toBe(true)
    const networkErrors = result.parsed.filter(l => l.prefix === 'network')
    expect(
      networkErrors.some(
        l => l.line.includes('localhost:1') && l.line.includes('failed')
      )
    ).toBe(true)
  }, 30_000)

  test('suppressed when showBrowserErrors is false', async () => {
    const url = htmlPage(`
      <script>throw new Error('hidden-error')</script>
      <img src="http://localhost:1/hidden.png">
    `)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 1500))`,
        hooksConfig: { showBrowserErrors: false },
      }),
    })

    expect(result.success).toBe(true)
    const errorLogs = result.parsed.filter(
      l => l.line.includes('page error') || l.prefix === 'network'
    )
    expect(errorLogs.length).toBe(0)
  }, 30_000)
})

describe('dialog hooks', () => {
  test('captures alert dialogs', async () => {
    const url = htmlPage(`<script>alert('test-alert-msg')</script>`)

    const result = await runChallenge({
      source: challengeSource({
        handler: `
    const page = await ctx.browserContext.newPage()
    page.on('dialog', d => d.dismiss())
    await page.goto('${url}')
    await new Promise(r => setTimeout(r, 1000))`,
        timeout: 10_000,
      }),
    })

    const dialogLogs = result.parsed.filter(l => l.prefix === 'dialog')
    expect(dialogLogs.some(l => l.line.includes('test-alert-msg'))).toBe(true)
    expect(dialogLogs.some(l => l.line.includes('alert'))).toBe(true)
  }, 30_000)
})
