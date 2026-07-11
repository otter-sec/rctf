<script lang="ts">
  import * as accordion from '@zag-js/accordion'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLDivElement> & {
    value?: string[]
    multiple?: boolean
    items: string[]
    onValueChange?: (value: string[]) => void
    header: Snippet<[{ value: string; props: Record<string, unknown>; expanded: boolean }]>
    content: Snippet<[{ value: string; props: Record<string, unknown> }]>
  }

  let {
    value = $bindable([]),
    multiple = true,
    items,
    onValueChange,
    header,
    content,
    ...rest
  }: Props = $props()

  const id = $props.id()
  const service = useMachine(accordion.machine, () => ({
    id,
    multiple,
    value,
    onValueChange(details: { value: string[] }) {
      value = details.value
      onValueChange?.(details.value)
    },
  }))
  const api = $derived(accordion.connect(service, normalizeProps))
</script>

<div {...api.getRootProps()} {...rest}>
  {#each items as item (item)}
    {@const state = api.getItemState({ value: item })}
    <div {...api.getItemProps({ value: item })}>
      {@render header({
        value: item,
        props: api.getItemTriggerProps({ value: item }) as Record<string, unknown>,
        expanded: state.expanded,
      })}
      {@render content({
        value: item,
        props: api.getItemContentProps({ value: item }) as Record<string, unknown>,
      })}
    </div>
  {/each}
</div>
