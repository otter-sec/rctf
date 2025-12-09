<script lang="ts">
  import type { IconComponent } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    icon: IconComponent
    title: string
    subtitle?: string
    class?: string
  }

  let { icon: Icon, title, subtitle, class: className }: Props = $props()
</script>

<div
  class={cn(
    'mx-auto flex max-w-sm flex-col items-center justify-center gap-3 py-16 text-center',
    className
  )}
>
  <Icon class="text-foreground-l4 size-12" />
  <div class="flex flex-col gap-1">
    <span class="text-foreground-l3 text-lg">{title}</span>
    {#if subtitle}
      <span class="text-foreground-l5 text-sm">{subtitle}</span>
    {/if}
  </div>
</div>
