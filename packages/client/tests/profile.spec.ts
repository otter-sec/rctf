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
    await page.goto('http://localhost:8080/profile')
  })

  test('Verify profile page is rendered correctly', async ({ page }) => {
    await expect(page.getByText('Team Invite', { exact: true })).toBeVisible()
    await expect(page.locator('text=Update Information')).toBeVisible()
    await expect(
      page.getByText('Team Information', { exact: true })
    ).toBeVisible()
    await expect(page.getByText('Solves', { exact: true })).toBeVisible()
    await expect(
      page.getByText('CTFtime Integration', { exact: true })
    ).toBeVisible()
  })

  test('should copy invite URL to clipboard when Copy button is clicked', async ({
    page,
  }) => {
    const copyButton = page.locator('button:has-text("Copy")')
    await expect(copyButton).toBeVisible()

    const clipboardHandle = await page.evaluateHandle(() => {
      return {
        _text: '',
        writeText: function (text) {
          this._text = text
        },
        readText: function () {
          return this._text
        },
      }
    })

    await page.evaluate(clipboard => {
      Object.defineProperty(navigator, 'clipboard', {
        value: clipboard,
        configurable: true,
      })
    }, clipboardHandle)

    await copyButton.click()

    const copiedText = await page.evaluate(() => navigator.clipboard.readText())
    expect(copiedText).toContain('/login?token=')
  })

  test('should reveal and hide the team invite URL when Reveal/Hide button is clicked', async ({
    page,
  }) => {
    const revealButton = page.locator('button:has-text("Reveal")')
    await expect(revealButton).toBeVisible()
    await revealButton.click()

    const inviteBlockquote = page.locator('blockquote')
    await expect(inviteBlockquote).toBeVisible()
    await expect(inviteBlockquote).toContainText('/login?token=')

    const hideButton = page.locator('button:has-text("Hide")')
    await expect(hideButton).toBeVisible()
    await hideButton.click()

    await expect(page.locator('blockquote')).not.toBeVisible()
  })

  test('should allow updating team information', async ({ page }) => {
    const TEST_EMAIL = 'contactuauth@gmail.com'
    const TEST_NAME = `Test Team ${Math.random().toString(36).substring(7)}`

    const teamNameInput = page.locator('input[name="name"]')
    const emailInput = page.locator('input[name="email"]').nth(0)
    const divisionSelect = page.locator('select[name="division"]')
    const updateButton = page.locator('button:has-text("Update")')

    await expect(teamNameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
    await expect(divisionSelect).toBeVisible()
    await expect(updateButton).toBeVisible()

    // Check empty name
    await teamNameInput.fill('')
    await updateButton.click()
    await expect(teamNameInput).toBeFocused()

    await teamNameInput.fill(TEST_NAME)

    // Check empty email
    await emailInput.fill('')
    await updateButton.click()
    await page.waitForTimeout(1000)
    const errorToast = page.locator('.toast--error')
    await expect(errorToast).toBeVisible()

    // Successfull profile update
    await emailInput.fill(TEST_EMAIL)
    await updateButton.click()
    await page.waitForTimeout(1000)
    const successToast = page.locator('.toast--undefined')
    await expect(successToast).toBeVisible()

    await expect(successToast).toContainText('Profile updated')
  })

  test('should allow add & delete new team member', async ({ page }) => {
    const TEST_EMAIL = 'contactuauth@gmail.com'
    const TEST_NAME = `Test Team ${Math.random().toString(36).substring(7)}`

    const emailInput = page.locator('input[name="email"]').nth(1)
    const updateButton = page.locator('button:has-text("Add member")')

    await expect(emailInput).toBeVisible()
    await expect(updateButton).toBeVisible()

    // Check empty name
    await emailInput.fill('')
    await updateButton.click()
    await expect(emailInput).toBeFocused()

    await emailInput.fill(TEST_EMAIL)

    // Successfull profile update
    await emailInput.fill(TEST_EMAIL)
    await updateButton.click()
    await page.waitForTimeout(1000)
    const addSuccessToast = page.locator('.toast--undefined')
    await expect(addSuccessToast).toBeVisible()
    await expect(addSuccessToast).toContainText(
      'Team member successfully added'
    )

    await page.waitForTimeout(4000)

    const deleteButton = page.locator('input[value="Delete"]')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()
    await page.waitForTimeout(1000)
    const deleteSuccessToast = page.locator('.toast--undefined')
    await expect(deleteSuccessToast).toBeVisible()
    await expect(addSuccessToast).toContainText(
      'Team member successfully deleted'
    )
  })
})
