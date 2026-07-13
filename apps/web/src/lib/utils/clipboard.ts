import { toast } from '$lib/toast'

export async function copyText(
  text: string,
  successMessage: string,
  errorMessage = 'Failed to copy to clipboard'
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error(errorMessage)
  }
}
