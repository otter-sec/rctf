<script lang="ts">
  import { IconSearch } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    value: string
    placeholder?: string
    class?: string
    onInput: (value: string) => void
  }

  let { value, placeholder = 'Search...', class: className, onInput }: Props = $props()
</script>

<div
  class={cn(
    'bg-background-l4 focus-within:ring-ring/50 flex h-10 flex-1 items-center justify-between rounded-r-sm px-4 focus-within:ring-[3px]',
    className
  )}
>
  <input
    type="text"
    {placeholder}
    class="placeholder:text-foreground-l4 w-full bg-transparent text-base outline-none"
    {value}
    oninput={e => onInput(e.currentTarget.value)}
  />
  <IconSearch class="text-foreground-l2 size-5 shrink-0" />
</div>
