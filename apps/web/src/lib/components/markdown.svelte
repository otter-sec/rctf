<script lang="ts">
  import { parseMarkdown, type AlertType } from '$lib/utils'
  import { mount, onMount, unmount } from 'svelte'
  import MarkdownAlert from './markdown-alert.svelte'

  interface Props {
    content: string
    class?: string
  }

  let { content, class: className = '' }: Props = $props()

  let container: HTMLDivElement
  let mounted: ReturnType<typeof mount>[] = []
  const html = $derived(parseMarkdown(content))

  function getAlertType(el: Element): AlertType {
    const type = el.getAttribute('data-type')
    if (
      type === 'note' ||
      type === 'tip' ||
      type === 'important' ||
      type === 'warning' ||
      type === 'caution' ||
      type === 'connection'
    ) {
      return type
    }
    return 'note'
  }

  function hydrate() {
    if (!container) return
    mounted.forEach(c => unmount(c))
    mounted = [...container.querySelectorAll('[data-alert]')].map(el =>
      mount(MarkdownAlert, {
        target: el,
        props: {
          type: getAlertType(el),
          content: el.getAttribute('data-content') ?? '',
          parsedContent: el.getAttribute('data-parsed') ?? '',
        },
      })
    )
  }

  onMount(() => {
    hydrate()
    return () => mounted.forEach(c => unmount(c))
  })

  $effect(() => {
    html
    container && queueMicrotask(hydrate)
  })
</script>

<div bind:this={container} class="prose {className}">
  {@html html}
</div>
