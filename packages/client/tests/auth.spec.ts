import { test, expect } from '@playwright/test'
import testConfig from '../testConfig'

test.describe('rCTF Login Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login`)
  })
  test('should have the correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(`Login | ${testConfig.ctfName}`)
  })

  test('should display the Team Token input field', async ({ page }) => {
    await expect(page.locator('input[name="teamToken"]')).toBeVisible()
  })

  test('should log in successfully with a valid Team Token', async ({
    page,
  }) => {
    await page.fill('input[name="teamToken"]', `${testConfig.loginToken}`)
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    await page.waitForNavigation()
    await expect(page).not.toHaveURL(/login/)
  })

  test('should show error on invalid Team Token', async ({ page }) => {
    await page.fill('input[name="teamToken"]', 'invalidTeamToken')
    await page.click('button[type="submit"]')
    await expect(page.locator('.text-danger')).toHaveText(
      /The token provided is invalid./
    )
  })

  test('should prevent submission if Team Token is empty', async ({ page }) => {
    const teamTokenInput = page.locator('input[name="teamToken"]')
    const submitButton = page.locator('button[type="submit"]')

    await submitButton.click()

    await expect(teamTokenInput).toBeFocused()
  })

  test('should navigate to recover page when clicking "Lost your team token?" link', async ({
    page,
  }) => {
    const recoverLink = page.locator('a[href="/recover"]')
    await expect(recoverLink).toBeVisible()
    await recoverLink.click()
    await expect(page).toHaveURL(`${testConfig.baseUrl}/recover`)
  })

  test('should not log in with a invalid Team URL', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login?token=invalid`)
    const appDiv = page.locator('#app')
    const verificationMessage = appDiv.locator('.row.u-center h4')
    await expect(verificationMessage).toContainText(
      `Log in to ${testConfig.ctfName}`
    )
  })

  test('should go to dashboard page without user login', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/profile`)
    await expect(page).toHaveURL(`${testConfig.baseUrl}/`)
  })
})

test.describe('rCTF Register Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/register`)
  })

  test('should have the correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Registration/)
  })

  test('should display the Team Name & Email input field', async ({ page }) => {
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('should log in successfully with a valid team name & email', async ({
    page,
  }) => {
    await page.fill('input[name="name"]', testConfig.testRegName)
    await page.fill('input[name="email"]', testConfig.testRegEmail)
    await page.click('button[type="submit"]')
    const appDiv = page.locator('#app')
    const verificationMessage = appDiv.locator('.row.u-center h3')
    await expect(verificationMessage).toHaveText('Verification email sent!')
  })

  test('should prevent submission if Team name or email is empty', async ({
    page,
  }) => {
    const submitButton = page.locator('button[type="submit"]')

    const teamNameInput = page.locator('input[name="name"]')
    await submitButton.click()
    await expect(teamNameInput).toBeFocused()

    await page.fill('input[name="name"]', 'test_name')
    const teamEmailInput = page.locator('input[name="email"]')
    await submitButton.click()
    await expect(teamEmailInput).toBeFocused()
  })

  test('should handle CTFTIME button click and OAuth page has to be opened', async ({
    page,
    context,
  }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('div.col-6 > button.c0126').click(),
    ])
    await newPage.waitForLoadState()
    expect(newPage.url()).toMatch(/^https:\/\/oauth\.ctftime\.org\/authorize/)
    await newPage.close()
  })
})
