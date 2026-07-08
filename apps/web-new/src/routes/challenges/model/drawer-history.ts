export type CloseSource =
  | 'back'
  | 'esc'
  | 'backdrop'
  | 'resize-to-desktop'
  | 'programmatic'

export type CloseResolution = 'history-back' | 'close-direct'

export function resolveClose(
  source: CloseSource,
  hasDrawerEntryOnTop: boolean
): CloseResolution {
  if (source === 'back') return 'close-direct'
  return hasDrawerEntryOnTop ? 'history-back' : 'close-direct'
}

export function getDeepLinkId(
  url: URL,
  challengeIds: ReadonlySet<string>
): string | null {
  const id = url.searchParams.get('challenge')
  return id && challengeIds.has(id) ? id : null
}
