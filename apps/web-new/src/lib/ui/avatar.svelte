<script lang="ts">
  import * as avatar from '@zag-js/avatar'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import { getInitials } from '$lib/utils/initials'

  type Props = {
    src?: string | null
    name: string
  }

  let { src, name }: Props = $props()

  const id = $props.id()
  const service = useMachine(avatar.machine, { id })
  const api = $derived(avatar.connect(service, normalizeProps))
</script>

<span {...api.getRootProps()}>
  <span {...api.getFallbackProps()}>{getInitials(name)}</span>
  {#if src}
    <img {...api.getImageProps()} {src} alt={name} />
  {/if}
</span>

<style>
  [data-part='root'] {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: var(--avatar-size, 2.5rem);
    block-size: var(--avatar-size, 2.5rem);
    overflow: hidden;
    border-radius: var(--avatar-radius, var(--radius-lg));
  }

  [data-part='image'] {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  /* Zag hides the fallback with the `hidden` attribute once the image loads;
     an unconditional `display: flex` would override it and squeeze the image. */
  [data-part='fallback'][hidden] {
    display: none;
  }

  [data-part='fallback'] {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 100%;
    block-size: 100%;
    font-size: var(--step--1);
    color: var(--foreground-l3);
    background: var(--background-l4);
  }
</style>
