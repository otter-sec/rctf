const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ProfileFormFields {
  name?: string
  division?: string
  countryCode?: string | null
  statusText?: string | null
}

export interface ProfileCurrentUser {
  name: string
  division: string
  countryCode: string | null
  statusText: string | null
}

export function isProfileDirty(
  form: ProfileFormFields,
  user: ProfileCurrentUser
): boolean {
  return (
    (form.name ?? '') !== user.name ||
    (form.division ?? '') !== user.division ||
    (form.countryCode ?? null) !== (user.countryCode ?? null) ||
    (form.statusText ?? null) !== (user.statusText ?? null)
  )
}

export function isEmailValid(email: string | undefined): boolean {
  const raw = email ?? ''
  return raw === '' || EMAIL_REGEX.test(raw.trim())
}

export function isEmailDirty(
  email: string | undefined,
  currentEmail: string | null
): boolean {
  return (email ?? '') !== (currentEmail ?? '')
}

export type EmailSubmitBranch = 'delete' | 'none' | 'invalid' | 'put'

export function decideEmailBranch(
  email: string | undefined,
  canDelete: boolean
): EmailSubmitBranch {
  const trimmed = (email ?? '').trim()
  if (trimmed === '') {
    return canDelete ? 'delete' : 'none'
  }
  return isEmailValid(email) ? 'put' : 'invalid'
}

export function canDeleteEmail(
  emailEnabled: boolean,
  email: string | null | undefined,
  ctftimeId: string | null | undefined
): boolean {
  return Boolean(emailEnabled && email && ctftimeId)
}

export function canDeleteCtftime(
  ctftimeConfigured: boolean,
  ctftimeId: string | null | undefined,
  email: string | null | undefined
): boolean {
  return Boolean(ctftimeConfigured && ctftimeId && email)
}

export function emailButtonLabel(
  email: string | undefined,
  canDelete: boolean
): string {
  return (email ?? '').trim() === '' && canDelete
    ? 'Remove email'
    : 'Update email'
}

export interface DivisionOption {
  value: string
  label: string
}

export function allowedDivisionOptions(
  divisions: Record<string, string>,
  allowedDivisions: string[]
): DivisionOption[] {
  return Object.entries(divisions)
    .filter(([value]) => allowedDivisions.includes(value))
    .map(([value, label]) => ({ value, label }))
}
