<script lang="ts" module>
  import type { RankVariant } from '$lib/utils'

  export interface PodiumItem {
    label: string
    variant: RankVariant
    name: string
    avatarUrl: string | null
    // secondary line: a solve time for decay, a points string for dynamic
    detail: string
    // current user's slot — drives which slots stay visible as the panel narrows
    isSelf?: boolean
    // dashed "unsolved" / "no score" styling
    isPlaceholder?: boolean
  }
</script>

<script lang="ts">
  import { Avatar } from '$lib/components'
  import { cn, getInitials, getRankStyles } from '$lib/utils'

  interface Props {
    items: PodiumItem[]
  }

  let { items }: Props = $props()

  const selfIndex = $derived(items.findIndex(item => item.isSelf))

  const getVisibilityClass = (index: number): string => {
    if (index === selfIndex) return ''

    const nonSelfIndices = [0, 1, 2, 3].filter(i => i !== selfIndex)

    const hideOrder = selfIndex === 3 ? [2, 1, 0] : nonSelfIndices.reverse()

    const hidePosition = hideOrder.indexOf(index)

    if (hidePosition === 0) return 'hidden @4xl/details:flex'
    if (hidePosition === 1) return 'hidden @2xl/details:flex'
    if (hidePosition === 2) return 'hidden @md/details:flex'
    return ''
  }
</script>

<div
  class="grid grid-cols-1 gap-2 @md/details:grid-cols-2 @2xl/details:grid-cols-3 @4xl/details:grid-cols-4"
>
  {#each items as item, index (index)}
    {@const style = getRankStyles(item.variant)}
    {@const isEmpty = !item.name}
    {@const isPlaceholder = item.isPlaceholder ?? false}
    {@const visibilityClass = getVisibilityClass(index)}
    <div
      class={cn(
        'flex h-14 items-center justify-between gap-2 rounded-lg border-2 border-transparent p-1',
        isEmpty || isPlaceholder ? 'border-border border-dashed' : style.bg,
        visibilityClass
      )}
    >
      {#if item.label}
        <span class={cn('pl-1 text-base', isPlaceholder ? 'text-foreground-l4' : style.fgL0)}>
          {item.label}
        </span>
      {/if}
      {#if !isEmpty}
        <div class="flex min-w-0 items-center gap-2">
          <div class="flex min-w-0 flex-col items-end">
            <span
              class={cn(
                'w-full truncate text-right text-base',
                isPlaceholder ? 'text-foreground-l4' : style.fgL0
              )}
            >
              {item.name}
            </span>
            <span
              class={cn(
                'w-full truncate text-right text-sm',
                isPlaceholder ? 'text-foreground-l5/50' : style.fgL1
              )}
            >
              {item.detail}
            </span>
          </div>
          <Avatar.Root class="size-11 shrink-0 rounded-md text-sm">
            {#if item.avatarUrl}
              <Avatar.Image src={item.avatarUrl} alt={item.name} class="rounded-md" />
            {/if}
            <Avatar.Fallback class="rounded-md">
              {getInitials(item.name)}
            </Avatar.Fallback>
          </Avatar.Root>
        </div>
      {/if}
    </div>
  {/each}
</div>
