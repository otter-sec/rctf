import { test, expect } from '@playwright/test'

test.describe('Challenges Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/login')

    // Fill login token and submit
    await page.fill(
      'input[name="teamToken"]',
      'http://localhost:8080/login?token=1cweecsMOoefSKaxtUMKVHi3zd5vF0Qgk41PW8DXTQcJjI95Nw5gMYHE9uB5jFdsnippN25QeyKvRBQBXCdUsMCDXdF8yJC9FObNqiCE%2FjqrTheDXTAMe1Anqver'
    )
    await page.click('button[type="submit"]')

    await page.waitForNavigation()

    await page.goto('http://localhost:8080/challs')
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
    await expect(page.locator('#category-College')).toBeVisible()
    await expect(page.locator('#category-High\\ school')).toBeVisible()
  })

  test('should toggle "Show Solved" checkbox', async ({ page }) => {
    const showSolvedCheckbox = page.locator('#show-solved')

    const showSolvedLabel = page.locator('label[for="show-solved"]')

    await expect(showSolvedCheckbox).not.toBeChecked()
    await showSolvedLabel.click() // Click the label instead
    await expect(showSolvedCheckbox).toBeChecked()

    await showSolvedLabel.click()
    await expect(showSolvedCheckbox).not.toBeChecked()
  })

  test('should toggle all category filters', async ({ page }) => {
    const categoryCheckboxes = page.locator(
      '.form-ext-control.form-ext-checkbox input[type="checkbox"]'
    )
    const count = await categoryCheckboxes.count()

    for (let i = 0; i < count; i++) {
      const checkbox = categoryCheckboxes.nth(i)

      const label = page.locator(
        `label[for="${await checkbox.getAttribute('id')}"]`
      )

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
    const TEST_CHALLENGE = 'High school/1. Can you find root?'
    const TEST_CHALLENGE_ANSWER = 'flag(linux_flag)'
    const challengeTitle = page.locator(
      `.frame__title:has-text("${TEST_CHALLENGE}")`
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

    await flagInput.fill(TEST_CHALLENGE_ANSWER)
    await submitButton.click()

    const successToast = page.locator('text=Flag successfully submitted!')
    await expect(successToast).toBeVisible()
  })
})
