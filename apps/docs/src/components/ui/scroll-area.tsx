import { cn } from '@/lib/utils'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import * as React from 'react'

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  fades?: boolean
  viewportClassName?: string
}

type ScrollAreaFadeState = {
  top: boolean
  bottom: boolean
}

function ScrollArea({
  className,
  fades = false,
  viewportClassName,
  children,
  type = 'scroll',
  ...props
}: ScrollAreaProps) {
  const viewportRef = React.useRef<React.ComponentRef<typeof ScrollAreaPrimitive.Viewport>>(null)
  const [fadeState, setFadeState] = React.useState<ScrollAreaFadeState>({
    top: false,
    bottom: false,
  })

  const updateFadeState = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || !fades) return

    const maxScrollTop = viewport.scrollHeight - viewport.clientHeight
    const next = {
      top: maxScrollTop > 1 && viewport.scrollTop > 1,
      bottom: maxScrollTop > 1 && viewport.scrollTop < maxScrollTop - 1,
    }

    setFadeState(current =>
      current.top === next.top && current.bottom === next.bottom ? current : next
    )
  }, [fades])

  React.useEffect(() => {
    if (!fades) return

    const viewport = viewportRef.current
    if (!viewport) return

    updateFadeState()
    viewport.addEventListener('scroll', updateFadeState, { passive: true })

    const observer = new ResizeObserver(updateFadeState)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)

    return () => {
      viewport.removeEventListener('scroll', updateFadeState)
      observer.disconnect()
    }
  }, [fades, updateFadeState])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      type={type}
      scrollHideDelay={250}
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          'ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1',
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {fades && (
        <>
          <div
            aria-hidden="true"
            data-slot="scroll-area-fade-top"
            className={cn(
              'from-background pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b to-transparent transition-opacity',
              fadeState.top ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div
            aria-hidden="true"
            data-slot="scroll-area-fade-bottom"
            className={cn(
              'from-background pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t to-transparent transition-opacity',
              fadeState.bottom ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      )}
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
