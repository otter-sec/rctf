<script lang="ts">
  import { cn, type WithoutChild } from '$lib/utils'
  import { ScrollArea as ScrollAreaPrimitive } from 'bits-ui'
  import { Scrollbar } from './index.js'

  let {
    ref = $bindable(null),
    viewportRef = $bindable(null),
    class: className,
    orientation = 'vertical',
    scrollbarXClasses = '',
    scrollbarYClasses = '',
    scrollbarXStyles = '',
    scrollbarYStyles = '',
    fadeSize = 24,
    fadeColor = 'background-l0',
    fadeOffsets = {},
    viewportClass = '',
    viewportTabIndex,
    children,
    ...restProps
  }: WithoutChild<ScrollAreaPrimitive.RootProps> & {
    orientation?: 'vertical' | 'horizontal' | 'both' | undefined
    scrollbarXClasses?: string | undefined
    scrollbarYClasses?: string | undefined
    scrollbarXStyles?: string | undefined
    scrollbarYStyles?: string | undefined
    viewportRef?: HTMLElement | null
    viewportTabIndex?: number | undefined
    fadeSize?: number
    fadeColor?: string
    fadeOffsets?: {
      top?: number | string
      bottom?: number | string
      left?: number | string
      right?: number | string
    }
    viewportClass?: string | undefined
  } = $props()

  let internalViewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)
  let fadeRaf = 0

  const hasVertical = $derived(orientation === 'vertical' || orientation === 'both')
  const hasHorizontal = $derived(orientation === 'horizontal' || orientation === 'both')

  const topOffset = $derived(
    typeof fadeOffsets.top === 'number' ? `${fadeOffsets.top}px` : (fadeOffsets.top ?? '0px')
  )
  const bottomOffset = $derived(
    typeof fadeOffsets.bottom === 'number'
      ? `${fadeOffsets.bottom}px`
      : (fadeOffsets.bottom ?? '0px')
  )
  const leftOffset = $derived(
    typeof fadeOffsets.left === 'number' ? `${fadeOffsets.left}px` : (fadeOffsets.left ?? '0px')
  )
  const rightOffset = $derived(
    typeof fadeOffsets.right === 'number' ? `${fadeOffsets.right}px` : (fadeOffsets.right ?? '0px')
  )

  function updateFades() {
    const viewport = internalViewportRef
    if (!viewport) return

    const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = viewport
    // Start edges use a strict 0 so any scroll shows a fade; end edges keep 1px
    // of slop so the fade still clears at the extreme on fractional-DPI displays.
    const endTolerance = 1

    if (hasVertical) {
      const nextTopFade = scrollTop > 0
      const nextBottomFade = scrollTop + clientHeight < scrollHeight - endTolerance
      if (showTopFade !== nextTopFade) showTopFade = nextTopFade
      if (showBottomFade !== nextBottomFade) showBottomFade = nextBottomFade
    }

    if (hasHorizontal) {
      const nextLeftFade = scrollLeft > 0
      const nextRightFade = scrollLeft + clientWidth < scrollWidth - endTolerance
      if (showLeftFade !== nextLeftFade) showLeftFade = nextLeftFade
      if (showRightFade !== nextRightFade) showRightFade = nextRightFade
    }
  }

  function scheduleUpdateFades() {
    if (fadeRaf) return
    fadeRaf = requestAnimationFrame(() => {
      fadeRaf = 0
      updateFades()
    })
  }

  $effect(() => {
    const viewport = internalViewportRef
    if (!viewport || fadeSize <= 0) return

    updateFades()

    viewport.addEventListener('scroll', scheduleUpdateFades, { passive: true })
    // Observe both the viewport and its content: the viewport box stays fixed
    // while async content fills the list after mount, so only the content's
    // resize reveals overflow that should turn the fades on.
    const resizeObserver = new ResizeObserver(updateFades)
    resizeObserver.observe(viewport)
    const content = viewport.firstElementChild
    if (content) resizeObserver.observe(content)

    return () => {
      viewport.removeEventListener('scroll', scheduleUpdateFades)
      resizeObserver.disconnect()
      if (fadeRaf) {
        cancelAnimationFrame(fadeRaf)
        fadeRaf = 0
      }
    }
  })

  $effect(() => {
    viewportRef = internalViewportRef
  })
</script>

<ScrollAreaPrimitive.Root
  bind:ref
  data-slot="scroll-area"
  class={cn('relative', className)}
  {...restProps}
>
  <ScrollAreaPrimitive.Viewport
    bind:ref={internalViewportRef}
    data-slot="scroll-area-viewport"
    tabindex={viewportTabIndex}
    class={cn(
      'focus-visible:ring-ring/50 size-full rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-inset',
      hasHorizontal && 'overscroll-x-none',
      hasVertical && 'overscroll-y-none',
      viewportClass
    )}
  >
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>

  {#if hasVertical && fadeSize > 0}
    <div
      class={cn(
        'pointer-events-none absolute z-10',
        showTopFade ? 'opacity-100' : 'opacity-0'
      )}
      style="
        top: {topOffset};
        left: {leftOffset};
        right: {rightOffset};
        height: {fadeSize}px;
        background: linear-gradient(to bottom, var(--{fadeColor}), transparent);
      "
      aria-hidden="true"
    ></div>

    <div
      class={cn(
        'pointer-events-none absolute z-10',
        showBottomFade ? 'opacity-100' : 'opacity-0'
      )}
      style="
        bottom: {bottomOffset};
        left: {leftOffset};
        right: {rightOffset};
        height: {fadeSize}px;
        background: linear-gradient(to top, var(--{fadeColor}), transparent);
      "
      aria-hidden="true"
    ></div>
  {/if}

  {#if hasHorizontal && fadeSize > 0}
    <div
      class={cn(
        'pointer-events-none absolute z-10',
        showLeftFade ? 'opacity-100' : 'opacity-0'
      )}
      style="
        left: {leftOffset};
        top: {topOffset};
        bottom: {bottomOffset};
        width: {fadeSize}px;
        background: linear-gradient(to right, var(--{fadeColor}), transparent);
      "
      aria-hidden="true"
    ></div>

    <div
      class={cn(
        'pointer-events-none absolute z-10',
        showRightFade ? 'opacity-100' : 'opacity-0'
      )}
      style="
        right: {rightOffset};
        top: {topOffset};
        bottom: {bottomOffset};
        width: {fadeSize}px;
        background: linear-gradient(to left, var(--{fadeColor}), transparent);
      "
      aria-hidden="true"
    ></div>
  {/if}

  {#if hasVertical}
    <Scrollbar orientation="vertical" class={scrollbarYClasses} style={scrollbarYStyles} />
  {/if}
  {#if hasHorizontal}
    <Scrollbar orientation="horizontal" class={scrollbarXClasses} style={scrollbarXStyles} />
  {/if}
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
