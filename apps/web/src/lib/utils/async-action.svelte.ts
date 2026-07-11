import { toast } from '$lib/toast'

type AsyncActionOptions<TKey> = {
  key?: TKey
} & (
  | { errorMessage: string; onError?: never }
  | { errorMessage?: never; onError: (error: unknown) => void }
)

export function createAsyncAction<TKey = never>() {
  let pending = $state(false)
  let key = $state<TKey | null>(null)

  async function run<TResult>(
    task: () => Promise<TResult>,
    options: AsyncActionOptions<TKey>
  ): Promise<TResult | undefined> {
    if (pending) return undefined

    pending = true
    key = options.key ?? null
    try {
      return await task()
    } catch (error) {
      if (options.onError) {
        options.onError(error)
      } else {
        toast.error(
          error instanceof Error ? error.message : options.errorMessage
        )
      }
      return undefined
    } finally {
      pending = false
      key = null
    }
  }

  return {
    get pending() {
      return pending
    },
    get key() {
      return key
    },
    run,
  }
}
