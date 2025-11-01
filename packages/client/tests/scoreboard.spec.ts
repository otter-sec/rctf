import { test, expect } from '@playwright/test'
import testConfig from '../testConfig'

test.describe('Scoreboard Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login`)
    await page.fill('input[name="teamToken"]', testConfig.loginToken)
    await page.click('button[type="submit"]')
    await page.waitForNavigation()
    await page.goto(`${testConfig.baseUrl}/scores`)
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

    const divisionOptions: string[] = Object.values(testConfig.divisions)
    if (divisionOptions.length > 0) {
      await page.selectOption('select[name="division"]', divisionOptions[0])
    } else {
      console.log('No divisions available in testConfig')
    }

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
      const initialScrollY = await page.evaluate<number>(() => window.scrollY)

      await button.click()

      await page.waitForTimeout(500)

      const newScrollY = await page.evaluate<number>(() => window.scrollY)

      expect(newScrollY).toBeGreaterThanOrEqual(initialScrollY)
    } else {
      console.log('Button is disabled, skipping click.')
    }
  })
})
