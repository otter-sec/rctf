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

// A credential can be removed only while another one remains: the users table
// requires at least one of email, CTFtime, or password. One predicate for all
// three, because three copies is how the email and CTFtime versions came to
// miss the password that was added later.
export function canDeleteCredential(
  enabled: boolean,
  own: unknown,
  others: unknown[]
): boolean {
  return Boolean(enabled && own && others.some(Boolean))
}

export function emailButtonLabel(
  email: string | undefined,
  canDelete: boolean
): string {
  return (email ?? '').trim() === '' && canDelete
    ? 'Remove email'
    : 'Update email'
}

export function passwordMismatchError(
  password: string | undefined,
  confirmPassword: string
): string | null {
  if (confirmPassword === '' || password === confirmPassword) {
    return null
  }
  return 'Passwords do not match'
}

export function canSubmitPassword(
  password: string | undefined,
  confirmPassword: string,
  currentPassword: string | undefined,
  hasPassword: boolean
): boolean {
  if ((password ?? '') === '' || password !== confirmPassword) {
    return false
  }
  return !hasPassword || (currentPassword ?? '') !== ''
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
