<script lang="ts">
  import { Button, Spinner } from '$lib/components'
  import { IconCheck, IconSend } from '$lib/icons'
  import { cn, formatLocalTime } from '$lib/utils'

  type PendingVerification = {
    id: string
    name: string
    email: string
    division: string
    createdAt: number
    expiresAt: number
  }

  interface Props {
    verifications: PendingVerification[]
    total: number
    divisions?: Record<string, string>
    isPending: boolean
    error?: Error | null
    hasNextPage: boolean
    isFetchingNextPage: boolean
    completingId: string | null
    resendingId: string | null
    onComplete: (verification: PendingVerification) => void
    onResend: (verification: PendingVerification) => void
    onLoadMore: () => void
    class?: string
  }

  let {
    verifications,
    total,
    divisions,
    isPending,
    error,
    hasNextPage,
    isFetchingNextPage,
    completingId,
    resendingId,
    onComplete,
    onResend,
    onLoadMore,
    class: className,
  }: Props = $props()
</script>

{#if isPending || error || verifications.length > 0}
  <section class={cn('flex flex-col gap-2', className)}>
    <div class="flex items-center justify-between gap-3 px-1">
      <h2 class="text-foreground-l1 text-sm font-medium">
        Pending verifications
        {#if total > 0}
          <span class="text-foreground-l3 tabular-nums">({total})</span>
        {/if}
      </h2>
    </div>

    {#if isPending}
      <div class="bg-background-l1 flex h-24 items-center justify-center rounded-lg">
        <Spinner class="size-5" />
      </div>
    {:else if error}
      <div class="bg-background-l1 text-foreground-l3 rounded-lg p-4 text-sm">
        {error.message}
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each verifications as verification (verification.id)}
          {@const division = divisions?.[verification.division] ?? verification.division}
          {@const isCompleting = completingId === verification.id}
          {@const isResending = resendingId === verification.id}
          {@const isBusy = isCompleting || isResending}
          <div
            class="bg-background-l1 flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center"
          >
            <div class="min-w-0 flex-1">
              <div class="text-foreground-l1 truncate text-sm font-medium">
                {verification.name}
              </div>
              <div class="text-foreground-l3 truncate text-sm">
                {verification.email} - {division}
              </div>
              <div class="text-foreground-l3 truncate text-xs">
                Registered {formatLocalTime(verification.createdAt)} - Expires {formatLocalTime(
                  verification.expiresAt
                )}
              </div>
            </div>
            <div class="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onclick={() => onResend(verification)}
                disabled={isBusy}
              >
                {#if isResending}
                  <Spinner class="size-4" />
                {:else}
                  <IconSend class="size-4" />
                {/if}
                Resend
              </Button>
              <Button size="sm" onclick={() => onComplete(verification)} disabled={isBusy}>
                {#if isCompleting}
                  <Spinner class="size-4" />
                {:else}
                  <IconCheck class="size-4" />
                {/if}
                Complete
              </Button>
            </div>
          </div>
        {/each}
      </div>

      {#if hasNextPage}
        <Button
          variant="secondary"
          size="sm"
          class="self-start"
          onclick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {#if isFetchingNextPage}
            <Spinner class="size-4" />
          {/if}
          Load more
        </Button>
      {/if}
    {/if}
  </section>
{/if}
