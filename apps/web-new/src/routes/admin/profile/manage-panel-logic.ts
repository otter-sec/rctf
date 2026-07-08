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

export function buildUserUpdate(form: ManageForm): ManageUserUpdate {
  const statusText = (form.statusText ?? '').trim()
  return {
    name: form.name,
    division: form.division,
    countryCode: form.countryCode,
    statusText: statusText === '' ? null : form.statusText,
  }
}

export function divisionOptions(
  divisions: Record<string, string>
): DivisionOption[] {
  return Object.entries(divisions).map(([value, label]) => ({ value, label }))
}
