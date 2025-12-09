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
    children,
    ...restProps
  }: WithoutChild<ScrollAreaPrimitive.RootProps> & {
    orientation?: 'vertical' | 'horizontal' | 'both' | undefined
    scrollbarXClasses?: string | undefined
    scrollbarYClasses?: string | undefined
    scrollbarXStyles?: string | undefined
    scrollbarYStyles?: string | undefined
    viewportRef?: HTMLElement | null
    fadeSize?: number
    fadeColor?: string
    fadeOffsets?: {
      top?: number | string
      bottom?: number | string
      left?: number | string
      right?: number | string
    }
  } = $props()

  let internalViewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)

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
    const threshold = 10

    if (hasVertical) {
      showTopFade = scrollTop > threshold
      showBottomFade = scrollTop + clientHeight < scrollHeight - threshold
    }

    if (hasHorizontal) {
      showLeftFade = scrollLeft > threshold
      showRightFade = scrollLeft + clientWidth < scrollWidth - threshold
    }
  }

  $effect(() => {
    const viewport = internalViewportRef
    if (!viewport) return

    updateFades()

    viewport.addEventListener('scroll', updateFades, { passive: true })
    const resizeObserver = new ResizeObserver(updateFades)
    resizeObserver.observe(viewport)

    return () => {
      viewport.removeEventListener('scroll', updateFades)
      resizeObserver.disconnect()
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
    class={cn(
      'ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 size-full rounded-[inherit] focus-visible:outline-1 focus-visible:ring-4',
      hasHorizontal && 'overscroll-x-none',
      hasVertical && 'overscroll-y-none'
    )}
  >
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>

  {#if hasVertical && fadeSize > 0}
    <div
      class={cn(
        'pointer-events-none absolute z-10 transition-opacity',
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
        'pointer-events-none absolute z-10 transition-opacity',
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
        'pointer-events-none absolute z-10 transition-opacity',
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
        'pointer-events-none absolute z-10 transition-opacity',
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
