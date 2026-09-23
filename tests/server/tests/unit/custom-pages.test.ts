import { describe, expect, test } from 'bun:test'
import { CustomPageSchema } from '../../../../packages/config/src/types'

const customPage = {
  slug: 'rules',
  title: 'Rules',
  content: '# Competition rules',
}

describe('custom pages', () => {
  test('shows the page title by default', () => {
    expect(CustomPageSchema.parse(customPage).hideTitle).toBe(false)
  })

  test('allows the page title to be hidden', () => {
    expect(
      CustomPageSchema.parse({ ...customPage, hideTitle: true }).hideTitle
    ).toBe(true)
  })
})
