import { test, expect } from '@playwright/test'
import config from '../../server/src/config/client'
import dotenv from 'dotenv'

dotenv.config()
test.describe('rCTF Home Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.BASE_URL || 'http://localhost:8080') // Use env variable
  })

  test('should have the configured page description', async ({ page }) => {
    const appDiv = page.locator('#app')
    const pageDescription = appDiv.locator('.markup p')

    const expectedText = config.homeContent || '' // Ensure it's a string

    await expect(pageDescription).toHaveText(expectedText)
  })
})
