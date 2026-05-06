export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = globalThis.navigator?.clipboard
  if (!clipboard) {
    return false
  }

  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
