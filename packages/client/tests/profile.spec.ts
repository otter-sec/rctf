import { test, expect } from '@playwright/test'
import testConfig from '../testConfig'

interface ClipboardMock {
  _text: string
  writeText: (text: string) => Promise<void>
  readText: () => Promise<string>
}

test.describe('Profile Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login`)
    await page.fill('input[name="teamToken"]', testConfig.loginToken)
    await page.click('button[type="submit"]')
    await page.waitForNavigation()
    await page.goto(`${testConfig.baseUrl}/profile`)
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

    await page.evaluate(() => {
      const clipboard: ClipboardMock = {
        _text: '',
        async writeText(text: string) {
          this._text = text
        },
        async readText() {
          return this._text
        },
      }

      Object.defineProperty(navigator, 'clipboard', {
        value: clipboard,
        configurable: true,
      })
    })

    await copyButton.click()

    const copiedText = await page.evaluate<string>(async () =>
      navigator.clipboard.readText()
    )
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

    await teamNameInput.fill(testConfig.testUpdateName)

    // Check empty email
    await emailInput.fill('')
    await updateButton.click()
    await page.waitForTimeout(1000)
    const errorToast = page.locator('.toast--error')
    await expect(errorToast).toBeVisible()

    // Successfull profile update
    await emailInput.fill(testConfig.testUpdateEmail)
    await updateButton.click()
    await page.waitForTimeout(1000)
    const successToast = page.locator('.toast--undefined')
    await expect(successToast).toBeVisible()

    await expect(successToast).toContainText('Profile updated')
  })

  test('should allow add & delete new team member', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]').nth(1)
    const updateButton = page.locator('button:has-text("Add member")')

    await expect(emailInput).toBeVisible()
    await expect(updateButton).toBeVisible()

    // Check empty name
    await emailInput.fill('')
    await updateButton.click()
    await expect(emailInput).toBeFocused()

    await emailInput.fill(testConfig.testNewEmail)

    // Successfull profile update
    await emailInput.fill(testConfig.testNewEmail)
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
