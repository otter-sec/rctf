<script lang="ts">
  import { cn, type WithoutChild } from '$lib/utils.js'
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

  function updateFades() {
    const viewport = internalViewportRef
    if (!viewport) return

    const { scrollTop, scrollHeight, clientHeight } = viewport
    const threshold = 10

    showTopFade = scrollTop > threshold
    showBottomFade = scrollTop + clientHeight < scrollHeight - threshold
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
    class="ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 size-full rounded-[inherit] focus-visible:outline-1 focus-visible:ring-4"
  >
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>

  <div
    class={cn(
      'pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200',
      showTopFade ? 'opacity-100' : 'opacity-0'
    )}
    style={topFadeStyle}
    aria-hidden="true"
  ></div>

  <div
    class={cn(
      'pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-200',
      showBottomFade ? 'opacity-100' : 'opacity-0'
    )}
    style={bottomFadeStyle}
    aria-hidden="true"
  ></div>

  {#if orientation === 'vertical' || orientation === 'both'}
    <Scrollbar orientation="vertical" class={scrollbarYClasses} />
  {/if}
  {#if orientation === 'horizontal' || orientation === 'both'}
    <Scrollbar orientation="horizontal" class={scrollbarXClasses} />
  {/if}
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
