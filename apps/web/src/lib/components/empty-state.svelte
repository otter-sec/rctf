<script lang="ts">
  import Icon from '@iconify/svelte'
  import { cn } from '$lib/utils'

  type Props = {
    icon: string
    title: string
    subtitle?: string
    class?: string
  }

  let { icon, title, subtitle, class: className }: Props = $props()
</script>

<div
  class={cn(
    'flex flex-col items-center justify-center gap-3 py-16 text-center max-w-sm mx-auto',
    className
  )}
>
  <Icon {icon} class="size-12 text-foreground-l4" />
  <div class="flex flex-col gap-1">
    <span class="text-lg text-foreground-l3">{title}</span>
    {#if subtitle}
      <span class="text-sm text-foreground-l5">{subtitle}</span>
    {/if}
  </div>
</div>

