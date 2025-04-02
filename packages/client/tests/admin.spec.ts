import { test, expect } from '@playwright/test'
import testConfig from '../testConfig'

test.describe('Admin Challenges Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login`)
    await page.fill(
      'input[name="teamToken"]',
      `${testConfig.baseUrl}/login?token=${testConfig.loginToken}`
    )
    await page.click('button[type="submit"]')
    await page.waitForNavigation()
    await page.goto(`${testConfig.baseUrl}/admin/challs`)
  })

  test('should display challenge form fields', async ({ page }) => {
    const problemInput = page
      .locator('input[placeholder="Problem Name"]')
      .nth(0)
    await expect(problemInput).toBeVisible()

    const authorInput = page.locator('input[placeholder="Author"]').nth(0)
    await expect(authorInput).toBeVisible()

    const descriptionInput = page
      .locator('textarea[placeholder="Description"]')
      .nth(0)
    await expect(descriptionInput).toBeVisible()

    const flagInput = page.locator('input[placeholder="Flag"]').nth(0)
    await expect(flagInput).toBeVisible()

    const fileInput = page.locator('input[type="file"]').nth(0)
    await expect(fileInput).toBeVisible()

    const updateButton = page.locator('button:has-text("Update")').nth(0)
    await expect(updateButton).toBeVisible()

    const deleteButton = page.locator('button:has-text("Delete")').nth(0)
    await expect(deleteButton).toBeVisible()
  })

  test('should allow filling challenge details', async ({ page }) => {
    const problemInput = page
      .locator('input[placeholder="Problem Name"]')
      .nth(0)
    const authorInput = page.locator('input[placeholder="Author"]').nth(0)

    const descriptionInput = page
      .locator('textarea[placeholder="Description"]')
      .nth(0)

    const flagInput = page.locator('input[placeholder="Flag"]').nth(0)

    await problemInput.fill(testConfig.testNewChalName)
    await authorInput.fill(testConfig.testNewChalAuthor)
    await descriptionInput.fill(testConfig.testNewChalDes)
    await flagInput.fill(testConfig.testNewChalFlag)

    const tiebreakCheckbox = page.locator('input[type="checkbox"]').nth(0)
    if (!(await tiebreakCheckbox.isChecked())) {
      const label = page.locator(
        `label[for="${await tiebreakCheckbox.getAttribute('id')}"]`
      )
      await label.click()
    }

    await page.click('button:has-text("Update")')

    const successToast = page.locator('.toast--undefined')
    await expect(successToast).toBeVisible()
    await expect(successToast).toContainText('Problem successfully updated')
  })

  test('should allow deleting a challenge', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete")').nth(0)
    await expect(deleteButton).toBeVisible()

    await deleteButton.click()

    await page.waitForTimeout(500)

    const confirmDialog = page.locator('button:has-text("Delete Challenge")')
    if (await confirmDialog.isVisible()) {
      await confirmDialog.click()
    }

    const successToast = page.locator('.toast--success')
    await expect(successToast).toBeVisible()
    await expect(successToast).toContainText('successfully deleted')
  })
})
