// Shared helpers for the Playwright benchmark scripts.
import type { Page } from 'playwright'

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

export async function login(page: Page, base: string, loginToken: string) {
  await page.goto(`${base}/login?token=${encodeURIComponent(loginToken)}`)
  await page.waitForFunction(
    () => localStorage.getItem('token') !== null,
    undefined,
    { timeout: 15_000 }
  )
}
