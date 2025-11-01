import { test, expect } from '@playwright/test'
import testConfig from '../testConfig'

test.describe('Challenges Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login`)

    // Fill login token and submit
    await page.fill('input[name="teamToken"]', testConfig.loginToken)
    await page.click('button[type="submit"]')

    await page.waitForNavigation()

    await page.goto(`${testConfig.baseUrl}/challs`)
  })

  test('should render challenges page correctly', async ({ page }) => {
    await expect(
      page.locator('.frame__title:has-text("Filters")')
    ).toBeVisible()
    await expect(
      page.locator('.frame__title:has-text("Categories")')
    ).toBeVisible()
  })

  test('should have categories and filters', async ({ page }) => {
    await expect(page.locator('#show-solved')).toBeVisible()
  })

  test('should toggle all category filters', async ({ page }) => {
    const categoryCheckboxes = page.locator(
      '.form-ext-control.form-ext-checkbox input[type="checkbox"]'
    )
    const count = await categoryCheckboxes.count()

    for (let i = 0; i < count; i++) {
      const checkbox = categoryCheckboxes.nth(i)

      const checkboxId = await checkbox.getAttribute('id')
      expect(checkboxId).toBeTruthy()

      const label = page.locator(`label[for="${checkboxId as string}"]`)

      const categoryName = await label.innerText()
      console.log(`Toggling filter: ${categoryName}`)

      await expect(checkbox).not.toBeChecked()
      await label.click()
      await expect(checkbox).toBeChecked()

      await label.click()
      await expect(checkbox).not.toBeChecked()
    }
  })

  test('should submit a flag for a challenge', async ({ page }) => {
    const challengeTitle = page.locator(
      `.frame__title:has-text("${testConfig.testChal}")`
    )
    await expect(challengeTitle).toBeVisible()

    const challengeContainer = challengeTitle.locator(
      'xpath=ancestor::div[contains(@class, "frame__body")]'
    )
    await expect(challengeContainer).toBeVisible()

    const flagInput = challengeContainer.locator('input[placeholder="Flag"]')
    await flagInput.waitFor({ state: 'visible' })

    // Locate the submit button
    const submitButton = challengeContainer.locator('button:has-text("Submit")')
    await expect(submitButton).toBeVisible()

    await flagInput.fill(testConfig.testChalAns)
    await submitButton.click()

    const successToast = page.locator('text=Flag successfully submitted!')
    await expect(successToast).toBeVisible()
  })

  test('should toggle "Show Solved" checkbox', async ({ page }) => {
    const showSolvedCheckbox = page.locator('#show-solved')

    const showSolvedLabel = page.locator('label[for="show-solved"]')
    await expect(showSolvedCheckbox).not.toBeChecked()

    await showSolvedLabel.click() // Click the label instead
    await expect(showSolvedCheckbox).toBeChecked()

    const challengeTitle = page.locator(
      `.frame__title:has-text("${testConfig.testChal}")`
    )
    await expect(challengeTitle).toBeVisible()

    const challengeContainer = challengeTitle.locator(
      'xpath=ancestor::div[contains(@class, "frame__body")]'
    )
    await expect(challengeContainer).toBeVisible()

    const flagInput = challengeContainer.locator(
      'input[placeholder="Flag (solved)"]'
    )
    await flagInput.waitFor({ state: 'visible' })

    await showSolvedLabel.click()
    await expect(showSolvedCheckbox).not.toBeChecked()
  })
})
