export type TagAddResult =
  { kind: 'added'; value: string[] } | { kind: 'rejected' } | { kind: 'empty' }

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

export function removeTag(value: string[], index: number): string[] {
  return value.filter((_, i) => i !== index)
}

export function removeLastTag(value: string[]): string[] {
  if (value.length === 0) return value
  return value.slice(0, -1)
}
