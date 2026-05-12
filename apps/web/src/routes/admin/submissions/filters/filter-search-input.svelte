<script lang="ts">
  import { IconSearch } from '$lib/icons'

  interface Props {
    value: string
    placeholder: string
    onInput: (value: string) => void
    variant?: 'menu' | 'mobile'
  }

  let { value, placeholder, onInput, variant = 'menu' }: Props = $props()
</script>

{#if variant === 'mobile'}
  <div
    class="bg-background-l2 text-foreground-l3 flex h-10 items-center gap-2 rounded-md border-2 px-3"
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      {placeholder}
      {value}
      oninput={event => onInput(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{:else}
  <div
    role="presentation"
    class="text-foreground-l3 border-foreground-l4/40 flex h-11 shrink-0 items-center gap-2 border-b-2 px-3"
    onclick={event => event.stopPropagation()}
    onkeydown={event => event.stopPropagation()}
    onpointerdown={event => event.stopPropagation()}
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      {placeholder}
      {value}
      oninput={event => onInput(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{/if}
