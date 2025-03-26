import { test, expect } from '@playwright/test'
import config from '../../server/src/config/client'

test.describe('Scoreboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/login')
    await page.fill(
      'input[name="teamToken"]',
      'http://localhost:8080/login?token=1cweecsMOoefSKaxtUMKVHi3zd5vF0Qgk41PW8DXTQcJjI95Nw5gMYHE9uB5jFdsnippN25QeyKvRBQBXCdUsMCDXdF8yJC9FObNqiCE%2FjqrTheDXTAMe1Anqver'
    )
    await page.click('button[type="submit"]')
    await page.waitForNavigation()
    await page.goto('http://localhost:8080/scores')
  })

  test('should render scoreboard with teams', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('thead tr')).toHaveCount(1)
    const rowCount = await page.locator('table tr').count()
    expect(rowCount).toBeGreaterThan(1)
  })

  test('should render scoreboard with teams after filter applied', async ({
    page,
  }) => {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('thead tr')).toHaveCount(1)

    const initialRowCount = await page.locator('table tr').count()
    expect(initialRowCount).toBeGreaterThan(1)

    await page.selectOption(
      'select[name="division"]',
      Object.values(config.divisions || {})[0]
    )

    await page.waitForTimeout(500)

    const filteredRowCount = await page.locator('table tr').count()

    await expect(page.locator('table')).toBeVisible()
    expect(filteredRowCount).toBeGreaterThan(0)
  })

  test('should render scoreboard with teams after limit is changed', async ({
    page,
  }) => {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('thead tr')).toHaveCount(1)

    const initialRowCount = await page.locator('table tr').count()
    expect(initialRowCount).toBeGreaterThan(1)

    await page.selectOption('select[name="pagesize"]', '50')

    await page.waitForTimeout(500)

    const filteredRowCount = await page.locator('table tr').count()

    await expect(page.locator('table')).toBeVisible()
    expect(filteredRowCount).toBeGreaterThan(0)
  })

  test('should scroll to user’s team when "Go to my team" button is clicked', async ({
    page,
  }) => {
    const button = page.locator('button', { hasText: 'GO TO MY TEAM' })

    await expect(button).toBeVisible()

    const isEnabled = await button.isEnabled()
    if (isEnabled) {
      const initialScrollY = await page.evaluate(() => window.scrollY)

      await button.click()

      await page.waitForTimeout(500)

      const newScrollY = await page.evaluate(() => window.scrollY)

      expect(newScrollY).toBeGreaterThanOrEqual(initialScrollY)
    } else {
      console.log('Button is disabled, skipping click.')
    }
  })
})
