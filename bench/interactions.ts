// UX interaction probes (R3a input-to-next-paint, R3c 360px viewport check).
// Usage: bun bench/interactions.ts <base-url> <login-token>
// The flag submit uses a deliberately wrong flag so every run measures the same path.
import { chromium, type Page } from 'playwright'
import { login, median } from './lib'

const RUNS = 5
const FLAG_INPUT_SELECTOR =
  'input[data-flag-input], input[placeholder*="flag" i]'
const base = process.argv[2]
const loginToken = process.argv[3]
if (!base || !loginToken) {
  console.error('usage: bun bench/interactions.ts <base-url> <login-token>')
  process.exit(1)
}

// Time from committing an input to the next paint after the UI settles (double rAF).
async function inputToNextPaint(
  page: Page,
  action: () => Promise<void>
): Promise<number> {
  await page.evaluate(() => {
    ;(window as unknown as Record<string, number>).__t0 = performance.now()
  })
  await action()
  return page.evaluate(
    () =>
      new Promise<number>(resolve => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            resolve(
              performance.now() -
                (window as unknown as Record<string, number>).__t0!
            )
          })
        )
      })
  )
}

async function openFirstChallenge(page: Page) {
  await page.goto(`${base}/challenges`)
  // Pick a standard flag-bearing challenge (KOTH/instancer/admin-bot have no flag input).
  const item = page.getByText(/^(Rev|Pwn|Crypto|Web|Misc) \d+$/).first()
  await item.waitFor({ state: 'visible', timeout: 30_000 })
  await item.click()
  await page
    .locator(FLAG_INPUT_SELECTOR)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
}

async function flagSubmitProbe(page: Page): Promise<number> {
  const input = page.locator(FLAG_INPUT_SELECTOR).first()
  await input.fill('rctf{definitely_wrong_flag}')
  return inputToNextPaint(page, async () => {
    await input.press('Enter')
    await page.waitForTimeout(300)
  })
}

async function filterProbe(page: Page): Promise<number> {
  await page.goto(`${base}/challenges`)
  const search = page
    .locator(
      'input[type="search"], input[placeholder*="Search" i], input[placeholder*="Filter" i]'
    )
    .first()
  await search.waitFor({ state: 'visible', timeout: 30_000 })
  return inputToNextPaint(page, async () => {
    await search.fill('web')
    await page.waitForTimeout(150)
  })
}

async function smallViewportCheck(page: Page) {
  await page.setViewportSize({ width: 360, height: 740 })
  const results: Record<string, boolean> = {}
  for (const route of ['/', '/challenges', '/scores']) {
    await page.goto(`${base}${route}`)
    await page
      .waitForLoadState('networkidle', { timeout: 15_000 })
      .catch(() => {})
    results[route] = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  }
  return results
}

const browser = await chromium.launch()
const flagTimes: number[] = []
const filterTimes: number[] = []

const context = await browser.newContext()
const page = await context.newPage()
await login(page, base, loginToken)

for (let i = 0; i < RUNS; i++) {
  await openFirstChallenge(page)
  flagTimes.push(await flagSubmitProbe(page))
  filterTimes.push(await filterProbe(page))
}

const overflow = await smallViewportCheck(page)
await browser.close()

console.log(
  JSON.stringify(
    {
      base,
      runs: RUNS,
      flag_submit_input_to_paint_ms: Math.round(median(flagTimes)),
      filter_input_to_paint_ms: Math.round(median(filterTimes)),
      no_horizontal_overflow_at_360px: overflow,
    },
    null,
    2
  )
)
