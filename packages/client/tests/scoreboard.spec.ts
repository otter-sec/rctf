import { test, expect } from '@playwright/test'

test.describe('Scoreboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/scores')
  })

  test('should render scoreboard with teams', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('thead tr')).toHaveCount(1)
    const rowCount = await page.locator('table tr').count()
    expect(rowCount).toBeGreaterThan(1)
  })
})
