<script lang="ts">
  import MarkdownAlert from '$lib/components/markdown-alert.svelte'
  import MarkdownTimer from '$lib/components/markdown-timer.svelte'
  import {
    isAlertType,
    parseAlertContent,
    parseMarkdown,
    type AlertType,
  } from '$lib/utils/markdown'
  import { mount, unmount } from 'svelte'

  type Props = {
    content: string
  }

  let { content }: Props = $props()

  // oxlint-disable-next-line no-unassigned-vars -- svelte's bind:this directive assigns this element reference
  let container: HTMLElement
  const html = $derived(parseMarkdown(content))

  function getAlertType(el: Element): AlertType {
    const type = el.getAttribute('data-type') ?? ''
    return isAlertType(type) ? type : 'note'
  }

  $effect(() => {
    void html
    const instances = [
      ...[...container.querySelectorAll('[data-alert]')].map(el => {
        const type = getAlertType(el)
        const body = el.getAttribute('data-content') ?? ''
        return mount(MarkdownAlert, {
          target: el,
          props: {
            type,
            content: body,
            parsedContent: type === 'connection' ? '' : parseAlertContent(body),
          },
        })
      }),
      ...[...container.querySelectorAll('[data-timer]')].map(el =>
        mount(MarkdownTimer, { target: el })
      ),
    ]
    return () => instances.forEach(instance => unmount(instance))
  })
</script>

<prose-content bind:this={container}>
  {@html html}
</prose-content>
