<script lang="ts">
  import { IconSearch } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    value: string
    placeholder?: string
    variant?: 'default' | 'rounded'
    class?: string
    onInput: (value: string) => void
  }

  let {
    value,
    placeholder = 'Search...',
    variant = 'default',
    class: className,
    onInput,
  }: Props = $props()

  const containerClass = $derived(
    variant === 'rounded' ? 'rounded-full bg-background-l3' : 'rounded-r-sm bg-background-l2'
  )
</script>

<div class={cn('flex h-10 flex-1 items-center justify-between px-4', containerClass, className)}>
  <input
    type="text"
    {placeholder}
    class="w-full bg-transparent text-base outline-none placeholder:text-foreground-l4"
    {value}
    oninput={e => onInput(e.currentTarget.value)} />
  <IconSearch class="size-5 shrink-0 text-foreground-l2" />
</div>
