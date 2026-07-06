// Pure decision logic for the settings account form. Kept free of `$app/*` and
// Svelte runes so it runs under `bun test`. The comparators mirror the old app
// (`apps/web/src/routes/profile/profile-settings-account.svelte`) exactly,
// including its `?? ''` / `?? null` normalization.

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

/** True when any profile field differs from the current user (drives the dirty gate). */
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

/**
 * Client-side email validity: an empty field is valid (it means "remove"), a
 * non-empty field must match the regex. Emptiness is checked against the
 * untrimmed value to match the old app.
 */
export function isEmailValid(email: string | undefined): boolean {
  const raw = email ?? ''
  return raw === '' || EMAIL_REGEX.test(raw.trim())
}

/** True when the email field differs from the current user's email. */
export function isEmailDirty(
  email: string | undefined,
  currentEmail: string | null
): boolean {
  return (email ?? '') !== (currentEmail ?? '')
}

export type EmailSubmitBranch = 'delete' | 'none' | 'invalid' | 'put'

/**
 * Decides what submitting the email form should do:
 * - empty field + a removable email → DELETE the email
 * - empty field without a removable email → do nothing (removal not offered)
 * - non-empty but invalid → block with an inline error
 * - non-empty and valid → PUT the new email
 */
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

/**
 * Email can only be removed when the account keeps another auth method (linked
 * CTFtime), and only when the deployment has email enabled.
 */
export function canDeleteEmail(
  emailEnabled: boolean,
  email: string | null | undefined,
  ctftimeId: string | null | undefined
): boolean {
  return Boolean(emailEnabled && email && ctftimeId)
}

/**
 * CTFtime can only be unlinked when the account keeps another auth method (an
 * email), and only when the deployment has CTFtime configured. Exported for
 * reuse by the CTFtime settings section (U9).
 */
export function canDeleteCtftime(
  ctftimeConfigured: boolean,
  ctftimeId: string | null | undefined,
  email: string | null | undefined
): boolean {
  return Boolean(ctftimeConfigured && ctftimeId && email)
}

/** Submit-button copy: "Remove email" when clearing a removable email, else "Update email". */
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

/** Divisions the team may switch to: the config divisions intersected with the allowed set. */
export function allowedDivisionOptions(
  divisions: Record<string, string>,
  allowedDivisions: string[]
): DivisionOption[] {
  return Object.entries(divisions)
    .filter(([value]) => allowedDivisions.includes(value))
    .map(([value, label]) => ({ value, label }))
}
