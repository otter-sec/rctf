<!--
  Custom overlay scrollbars for the leaderboard scroll region. Native scrollbars
  cannot be inset, and the design offsets them: the vertical track starts below
  the sticky challenge header and the horizontal track starts after the sticky
  team column (matching the old app's padded ScrollArea bars). Thumbs are
  draggable and tracks page-jump on click.
-->
<script lang="ts">
  import { captureElement } from '$lib/attachments/capture-element'
  import type { ScrollGeometry } from './scores-leaderboard-scroll-geometry.svelte'

  interface Props {
    root: HTMLElement | null
    geometry: ScrollGeometry
  }

  let { root, geometry }: Props = $props()

  const scrollTop = $derived(geometry.scrollTop)
  const scrollLeft = $derived(geometry.scrollLeft)
  const scrollHeight = $derived(geometry.scrollHeight)
  const scrollWidth = $derived(geometry.scrollWidth)
  const clientHeight = $derived(geometry.clientHeight)
  const clientWidth = $derived(geometry.clientWidth)

  let trackY = $state<HTMLElement | null>(null)
  let trackX = $state<HTMLElement | null>(null)
  let trackHeight = $state(0)
  let trackWidth = $state(0)

  const MIN_THUMB = 24

  $effect(() => {
    const node = trackY
    if (!node) return
    const observer = new ResizeObserver(() => (trackHeight = node.offsetHeight))
    observer.observe(node)
    trackHeight = node.offsetHeight
    return () => observer.disconnect()
  })

  $effect(() => {
    const node = trackX
    if (!node) return
    const observer = new ResizeObserver(() => (trackWidth = node.offsetWidth))
    observer.observe(node)
    trackWidth = node.offsetWidth
    return () => observer.disconnect()
  })

  const maxScrollY = $derived(Math.max(0, scrollHeight - clientHeight))
  const maxScrollX = $derived(Math.max(0, scrollWidth - clientWidth))
  const showY = $derived(maxScrollY > 1 && trackHeight > 0)
  const showX = $derived(maxScrollX > 1)

  const thumbHeight = $derived(
    scrollHeight > 0 ? Math.max(MIN_THUMB, (clientHeight / scrollHeight) * trackHeight) : MIN_THUMB
  )
  const thumbY = $derived(
    maxScrollY > 0 ? (scrollTop / maxScrollY) * (trackHeight - thumbHeight) : 0
  )
  const thumbWidth = $derived(
    scrollWidth > 0 ? Math.max(MIN_THUMB, (clientWidth / scrollWidth) * trackWidth) : MIN_THUMB
  )
  const thumbX = $derived(
    maxScrollX > 0 ? (scrollLeft / maxScrollX) * (trackWidth - thumbWidth) : 0
  )

  function dragThumb(axis: 'x' | 'y', down: PointerEvent) {
    const node = root
    if (!node) return
    down.preventDefault()
    const thumb = down.currentTarget as HTMLElement
    thumb.setPointerCapture(down.pointerId)
    const startPointer = axis === 'y' ? down.clientY : down.clientX
    const startScroll = axis === 'y' ? node.scrollTop : node.scrollLeft
    const range = axis === 'y' ? trackHeight - thumbHeight : trackWidth - thumbWidth
    const maxScroll = axis === 'y' ? maxScrollY : maxScrollX
    const onMove = (move: PointerEvent) => {
      if (range <= 0) return
      const delta = (axis === 'y' ? move.clientY : move.clientX) - startPointer
      const next = startScroll + (delta / range) * maxScroll
      if (axis === 'y') node.scrollTop = next
      else node.scrollLeft = next
    }
    const onUp = () => {
      thumb.removeEventListener('pointermove', onMove)
      thumb.removeEventListener('pointerup', onUp)
    }
    thumb.addEventListener('pointermove', onMove)
    thumb.addEventListener('pointerup', onUp)
  }

  function jumpTrack(axis: 'x' | 'y', event: PointerEvent) {
    const node = root
    if (!node || event.target !== event.currentTarget) return
    const track = event.currentTarget as HTMLElement
    const rect = track.getBoundingClientRect()
    if (axis === 'y') {
      const ratio = (event.clientY - rect.top - thumbHeight / 2) / (trackHeight - thumbHeight)
      node.scrollTop = ratio * maxScrollY
    } else {
      const ratio = (event.clientX - rect.left - thumbWidth / 2) / (trackWidth - thumbWidth)
      node.scrollLeft = ratio * maxScrollX
    }
  }
</script>

{#if showY}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <scroll-track
    data-axis="y"
    {@attach captureElement(node => (trackY = node))}
    onpointerdown={(event: PointerEvent) => jumpTrack('y', event)}
  >
    <scroll-thumb
      style:block-size={`${thumbHeight}px`}
      style:translate={`0 ${thumbY}px`}
      onpointerdown={(event: PointerEvent) => dragThumb('y', event)}
    ></scroll-thumb>
  </scroll-track>
{/if}

{#if showX}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <scroll-track
    data-axis="x"
    {@attach captureElement(node => (trackX = node))}
    onpointerdown={(event: PointerEvent) => jumpTrack('x', event)}
  >
    <scroll-thumb
      style:inline-size={`${thumbWidth}px`}
      style:translate={`${thumbX}px 0`}
      onpointerdown={(event: PointerEvent) => dragThumb('x', event)}
    ></scroll-thumb>
  </scroll-track>
{/if}

<style>
  scroll-track {
    position: absolute;
    z-index: 25;
    display: block;

    &[data-axis='y'] {
      inset-block-start: 0;
      inset-block-end: 0;
      inset-inline-end: 0;
      inline-size: 0.5rem;
    }

    &[data-axis='x'] {
      display: none;
      inset-inline-start: 0;
      inset-inline-end: 0;
      inset-block-end: 0;
      block-size: 0.375rem;
    }
  }

  scroll-thumb {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: block;
    border-radius: var(--radius-full);
    background: var(--background-l4);

    &:hover,
    &:active {
      background: var(--background-l5);
    }
  }

  scroll-track[data-axis='y'] scroll-thumb {
    inline-size: 100%;
  }

  scroll-track[data-axis='x'] scroll-thumb {
    block-size: 100%;
  }

  @media (width >= 48rem) {
    scroll-track[data-axis='y'] {
      inset-block-start: var(--score-header-height);
      /* Stop above the horizontal scrollbar's dedicated rail. */
      inset-block-end: 0.5rem;
    }

    scroll-track[data-axis='x'] {
      display: block;
      /* + the cells' 0.25rem lead-in so the track starts flush with them. */
      inset-inline-start: calc(var(--score-team-column-width) + 0.25rem);
    }
  }
</style>
