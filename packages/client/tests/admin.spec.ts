import { test, expect } from '@playwright/test'

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/login')
    await page.fill(
      'input[name="teamToken"]',
      'http://localhost:8080/login?token=1cweecsMOoefSKaxtUMKVHi3zd5vF0Qgk41PW8DXTQcJjI95Nw5gMYHE9uB5jFdsnippN25QeyKvRBQBXCdUsMCDXdF8yJC9FObNqiCE%2FjqrTheDXTAMe1Anqver'
    )
    await page.click('button[type="submit"]')
    await page.waitForNavigation()
    await page.goto('http://localhost:8080/admin/challs')
  })
  

})
