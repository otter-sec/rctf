import { toast } from '$lib/toast'

/**
 * Copy text to the clipboard, surfacing the outcome as a toast.
 *
 * @param text - The text to write to the clipboard.
 * @param successMessage - Toast shown once the write resolves.
 */
export async function copyText(
  text: string,
  successMessage: string
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error('Failed to copy to clipboard')
  }
}
