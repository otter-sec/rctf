import type { Member } from '@rctf/types'

/** Client-side email shape check, mirroring the old app's members validation. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export type MemberChange =
  | { kind: 'add'; email: string }
  | { kind: 'remove'; id: string }
  | { kind: 'none' }

/**
 * Turn a tag-input change into a single membership mutation. An added email
 * (present in `next` but not `current`) wins over a removal, matching the old
 * component; a removal maps the dropped email back to its membership id — the
 * members API deletes by id, not email.
 */
export function diffMemberChange(
  currentEmails: string[],
  nextEmails: string[],
  members: Member[]
): MemberChange {
  const added = nextEmails.find(email => !currentEmails.includes(email))
  if (added !== undefined) return { kind: 'add', email: added.trim() }

  const removed = currentEmails.find(email => !nextEmails.includes(email))
  if (removed !== undefined) {
    const member = members.find(entry => entry.email === removed)
    if (member) return { kind: 'remove', id: member.id }
  }

  return { kind: 'none' }
}
