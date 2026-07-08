// Scoreboard stress (R1c) + client-side navigation latency (R1d).
// Usage: bun bench/stress-scoreboard.ts <base-url> <login-token>
// Requires: bunx playwright install chromium
import { chromium, type Page } from 'playwright'
import { login, median } from './lib'

const RUNS = 5
const ROUTES = ['/', '/challenges', '/scores', '/profile']

const base = process.argv[2]
const loginToken = process.argv[3]
if (!base || !loginToken) {
  console.error(
    'usage: bun bench/stress-scoreboard.ts <base-url> <login-token>'
  )
  process.exit(1)
}

async function timeToFirstRows(page: Page): Promise<number> {
  const start = Date.now()
  await page.goto(`${base}/scores`, { waitUntil: 'commit' })
  await page
    .locator('score-team-cell, [data-team-id]')
    .nth(5)
    .waitFor({ state: 'visible', timeout: 30_000 })
  return Date.now() - start
}

async function scrollFrameStats(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const el =
      document.scrollingElement &&
      document.scrollingElement.scrollHeight > innerHeight
        ? document.scrollingElement
        : (() => {
            for (const e of document.querySelectorAll('*')) {
              if (e.scrollHeight > e.clientHeight + 200) return e
            }
            return undefined
          })()
    if (!el) return -1
    const frames: number[] = []
    let last = performance.now()
    let raf = 0
    const tick = (t: number) => {
      frames.push(t - last)
      last = t
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const steps = 40
    for (let i = 0; i < steps; i++) {
      el.scrollTop += 500
      await new Promise(r => setTimeout(r, 50))
    }
    cancelAnimationFrame(raf)
    frames.sort((a, b) => a - b)
    return 1000 / (frames[Math.floor(frames.length / 2)] ?? 16.7)
  })
}

async function heapUsed(page: Page): Promise<number> {
  const client = await page.context().newCDPSession(page)
  await client.send('Performance.enable')
  const { metrics } = await client.send('Performance.getMetrics')
  return metrics.find(m => m.name === 'JSHeapUsedSize')?.value ?? -1
}

async function navLatency(page: Page): Promise<number> {
  const times: number[] = []
  for (const route of ROUTES) {
    const start = Date.now()
    await page.evaluate(r => {
      const a = document.querySelector(
        `a[href="${r}"]`
      ) as HTMLAnchorElement | null
      if (a) a.click()
      else history.pushState({}, '', r)
    }, route)
    await page
      .waitForLoadState('networkidle', { timeout: 15_000 })
      .catch(() => {})
    times.push(Date.now() - start)
  }
  return median(times)
}

const browser = await chromium.launch()
const ttfr: number[] = []
const fps: number[] = []
const heap: number[] = []
const nav: number[] = []

for (let run = 0; run < RUNS; run++) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, base, loginToken)
  ttfr.push(await timeToFirstRows(page))
  fps.push(await scrollFrameStats(page))
  heap.push(await heapUsed(page))
  nav.push(await navLatency(page))
  await context.close()
}

await browser.close()

console.log(
  JSON.stringify(
    {
      base,
      runs: RUNS,
      scoreboard_time_to_rows_ms: median(ttfr),
      scoreboard_scroll_fps: Math.round(median(fps) * 10) / 10,
      js_heap_after_load_mb: Math.round((median(heap) / 1024 / 1024) * 10) / 10,
      nav_latency_ms: median(nav),
    },
    null,
    2
  )
)
