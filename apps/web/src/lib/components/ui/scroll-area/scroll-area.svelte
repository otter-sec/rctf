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
    fadeSize = 24,
    fadeColor = 'background-l0',
    children,
    ...restProps
  }: WithoutChild<ScrollAreaPrimitive.RootProps> & {
    orientation?: 'vertical' | 'horizontal' | 'both' | undefined
    scrollbarXClasses?: string | undefined
    scrollbarYClasses?: string | undefined
    viewportRef?: HTMLElement | null
    fadeSize?: number
    fadeColor?: string
  } = $props()

  let internalViewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)

  const hasVertical = $derived(
    orientation === 'vertical' || orientation === 'both'
  )
  const hasHorizontal = $derived(
    orientation === 'horizontal' || orientation === 'both'
  )

  function updateFades() {
    const viewport = internalViewportRef
    if (!viewport) return

    const {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollLeft,
      scrollWidth,
      clientWidth,
    } = viewport
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

  const topFadeStyle = $derived(
    `height: ${fadeSize}px; background: linear-gradient(to bottom, var(--${fadeColor}), transparent);`
  )
  const bottomFadeStyle = $derived(
    `height: ${fadeSize}px; background: linear-gradient(to top, var(--${fadeColor}), transparent);`
  )
  const leftFadeStyle = $derived(
    `width: ${fadeSize}px; background: linear-gradient(to right, var(--${fadeColor}), transparent);`
  )
  const rightFadeStyle = $derived(
    `width: ${fadeSize}px; background: linear-gradient(to left, var(--${fadeColor}), transparent);`
  )
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

  {#if hasVertical}
    <div
      class={cn(
        'pointer-events-none absolute inset-x-0 top-0 transition-opacity',
        showTopFade ? 'opacity-100' : 'opacity-0'
      )}
      style={topFadeStyle}
      aria-hidden="true"
    ></div>

    <div
      class={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 transition-opacity',
        showBottomFade ? 'opacity-100' : 'opacity-0'
      )}
      style={bottomFadeStyle}
      aria-hidden="true"
    ></div>
  {/if}

  {#if hasHorizontal}
    <div
      class={cn(
        'pointer-events-none absolute inset-y-0 left-0 transition-opacity',
        showLeftFade ? 'opacity-100' : 'opacity-0'
      )}
      style={leftFadeStyle}
      aria-hidden="true"
    ></div>

    <div
      class={cn(
        'pointer-events-none absolute inset-y-0 right-0 transition-opacity',
        showRightFade ? 'opacity-100' : 'opacity-0'
      )}
      style={rightFadeStyle}
      aria-hidden="true"
    ></div>
  {/if}

  {#if hasVertical}
    <Scrollbar orientation="vertical" class={scrollbarYClasses} />
  {/if}
  {#if hasHorizontal}
    <Scrollbar orientation="horizontal" class={scrollbarXClasses} />
  {/if}
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
