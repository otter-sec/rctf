/** Pure add/remove decisions for the tag input, mirroring the old component. */

export type TagAddResult =
  | { kind: 'added'; value: string[] }
  | { kind: 'rejected' }
  | { kind: 'empty' }

/**
 * Decide the outcome of adding a raw entry. Trims first; an empty trim is a
 * no-op, a failed `validate` is rejected, otherwise the trimmed entry is
 * appended. Duplicates are kept — the old component never deduplicated.
 */
export function addTag(
  value: string[],
  raw: string,
  validate?: (entry: string) => boolean
): TagAddResult {
  const trimmed = raw.trim()
  if (!trimmed) return { kind: 'empty' }
  if (validate && !validate(trimmed)) return { kind: 'rejected' }
  return { kind: 'added', value: [...value, trimmed] }
}

/** Remove the entry at `index`, leaving the input unchanged if out of range. */
export function removeTag(value: string[], index: number): string[] {
  return value.filter((_, i) => i !== index)
}

/** Remove the last entry (Backspace on an empty input); no-op when empty. */
export function removeLastTag(value: string[]): string[] {
  if (value.length === 0) return value
  return value.slice(0, -1)
}
