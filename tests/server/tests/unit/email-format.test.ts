import { describe, expect, test } from 'bun:test'
import { formatEmailSender } from '../../../../apps/api/src/services/emails'

describe('email formatting', () => {
  test('quotes and escapes sender display names', () => {
    expect(formatEmailSender('Foo, Inc.', 'noreply@example.com')).toBe(
      '"Foo, Inc." <noreply@example.com>'
    )
    expect(formatEmailSender('Foo "CTF"', 'noreply@example.com')).toBe(
      '"Foo \\"CTF\\"" <noreply@example.com>'
    )
    expect(
      formatEmailSender('Foo\r\nBcc: bad@example.com', 'noreply@example.com')
    ).toBe('"Foo Bcc: bad@example.com" <noreply@example.com>')
  })
})
