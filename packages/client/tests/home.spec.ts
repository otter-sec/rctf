import { test, expect } from '@playwright/test'
import testConfig from '../testConfig'

test.describe('rCTF Home Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(testConfig.baseUrl)
  })

  test('should have the configured page description', async ({ page }) => {
    const appDiv = page.locator('#app')
    const pageDescription = appDiv.locator('.markup p')

    const expectedText = testConfig.homeContent || ''

    await expect(pageDescription).toHaveText(expectedText)
  })
})
