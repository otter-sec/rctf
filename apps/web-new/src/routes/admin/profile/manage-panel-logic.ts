// Pure helpers for the admin manage panel. Kept free of `$app/*` and Svelte
// runes so they run under `bun test`. The dirty gate reuses the player settings
// comparator (`isProfileDirty`) since the admin edit form carries the same four
// fields.

export type ManageForm = {
  name: string
  division: string
  countryCode: string | null
  statusText: string | null
}

export type ManageUserUpdate = {
  name: string
  division: string
  countryCode: string | null
  statusText: string | null
}

export type DivisionOption = {
  value: string
  label: string
}

export type ManageOriginal = {
  name: string
  division: string
  countryCode: string | null
  statusText: string | null
}

/**
 * True when any editable field differs from the persisted team, driving the
 * save gate. Mirrors the player settings comparator: blank/`null` status and
 * country are treated as equal so a never-set field does not read as dirty.
 *
 * @param form - Current edit-form field values.
 * @param original - The persisted team fields to compare against.
 */
export function isManageDirty(
  form: ManageForm,
  original: ManageOriginal
): boolean {
  return (
    form.name !== original.name ||
    form.division !== original.division ||
    (form.countryCode ?? null) !== (original.countryCode ?? null) ||
    (form.statusText ?? null) !== (original.statusText ?? null)
  )
}

/**
 * Builds the `data` payload for `PUT /v2/admin/users/:id` from the edit form,
 * normalizing a blank status to `null` (the nullable clear) so the badge is
 * removed rather than set to an empty string.
 *
 * @param form - Current edit-form field values.
 */
export function buildUserUpdate(form: ManageForm): ManageUserUpdate {
  const statusText = (form.statusText ?? '').trim()
  return {
    name: form.name,
    division: form.division,
    countryCode: form.countryCode,
    statusText: statusText === '' ? null : form.statusText,
  }
}

/**
 * Division choices for the edit form, in config order. The select is only shown
 * when more than one division exists.
 *
 * @param divisions - Division id → label map from the client config.
 */
export function divisionOptions(
  divisions: Record<string, string>
): DivisionOption[] {
  return Object.entries(divisions).map(([value, label]) => ({ value, label }))
}
