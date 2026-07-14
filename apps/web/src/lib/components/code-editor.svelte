<script lang="ts">
  import { captureElement } from '$lib/attachments/capture-element'
  import { loadHighlighter, type HighlightFn } from './code-highlight'

  interface Props {
    value: string
    language: string
    disabled: boolean
    rows?: number
    placeholder?: string
    label?: string
    invalid?: boolean
    wrap?: boolean
    oninput: (value: string) => void
    onblur?: () => void
  }

  let {
    value,
    language,
    disabled,
    rows = 16,
    placeholder,
    label,
    invalid = false,
    wrap = false,
    oninput,
    onblur,
  }: Props = $props()

  let highlight = $state<HighlightFn | null>(null)

  $effect(() => {
    let cancelled = false
    loadHighlighter(language).then(fn => {
      if (!cancelled) highlight = fn
    })
    return () => {
      cancelled = true
    }
  })

  const html = $derived(highlight?.(`${value}\n`) ?? null)

  let overlay = $state<HTMLElement | null>(null)
  const captureOverlay = captureElement<HTMLElement>(node => (overlay = node))

  let textarea = $state<HTMLTextAreaElement | null>(null)
  const captureTextarea = captureElement<HTMLTextAreaElement>(
    node => (textarea = node)
  )

  function syncScroll(event: Event) {
    if (!overlay) return
    const target = event.currentTarget as HTMLTextAreaElement
    overlay.scrollTop = target.scrollTop
    overlay.scrollLeft = target.scrollLeft
  }

  interface SelectionRect {
    top: number
    left: number
    width: number
    height: number
  }

  let selectionRects = $state<SelectionRect[]>([])
  function computeSelectionRects(): SelectionRect[] {
    if (!textarea || !overlay || document.activeElement !== textarea) {
      return []
    }
    const { selectionStart, selectionEnd } = textarea
    if (selectionStart === selectionEnd) {
      return []
    }
    const pre = overlay.querySelector('pre')
    if (!pre) {
      return []
    }

    const range = document.createRange()
    const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
    let offset = 0
    let startSet = false
    let endSet = false
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const next = offset + node.data.length
      if (!startSet && selectionStart <= next) {
        range.setStart(node, selectionStart - offset)
        startSet = true
      }
      if (startSet && selectionEnd <= next) {
        range.setEnd(node, selectionEnd - offset)
        endSet = true
        break
      }
      offset = next
    }
    if (!endSet) {
      return []
    }

    const preStyle = getComputedStyle(pre)
    const pitch = parseFloat(preStyle.lineHeight)
    const stub = parseFloat(preStyle.fontSize) / 2
    const preRect = pre.getBoundingClientRect()
    const rects = Array.from(range.getClientRects()).sort(
      (a, b) => a.top - b.top
    )

    const rows: SelectionRect[] = []
    for (const rect of rects) {
      const top = rect.top - preRect.top - (pitch - rect.height) / 2
      const row = rows.at(-1)
      if (row && Math.abs(top - row.top) < 2) {
        const right = Math.max(row.left + row.width, rect.right - preRect.left)
        row.left = Math.min(row.left, rect.left - preRect.left)
        row.width = right - row.left
      } else {
        rows.push({
          top,
          left: rect.left - preRect.left,
          width: rect.width,
          height: pitch,
        })
      }
    }
    for (const row of rows) {
      if (row.width < stub) {
        row.width = stub
      }
    }
    return rows
  }

  function updateSelectionRects() {
    selectionRects = computeSelectionRects()
  }

  $effect(() => {
    document.addEventListener('selectionchange', updateSelectionRects)
    return () =>
      document.removeEventListener('selectionchange', updateSelectionRects)
  })

  $effect(() => {
    void html
    updateSelectionRects()
  })

  $effect(() => {
    if (!overlay) return
    const observer = new ResizeObserver(updateSelectionRects)
    observer.observe(overlay)
    return () => observer.disconnect()
  })
</script>

<code-editor-shell
  data-invalid={invalid || undefined}
  data-wrap={wrap || undefined}
>
  {#if html !== null}
    <code-editor-overlay {@attach captureOverlay} aria-hidden="true">
      {#if selectionRects.length > 0}
        <code-editor-selection>
          {#each selectionRects as rect, i (i)}
            <div
              style:top="{rect.top}px"
              style:left="{rect.left}px"
              style:width="{rect.width}px"
              style:height="{rect.height}px"
            ></div>
          {/each}
        </code-editor-selection>
      {/if}
      {@html html}
    </code-editor-overlay>
  {/if}
  <textarea
    {@attach captureTextarea}
    data-highlighted={html !== null || undefined}
    {rows}
    {value}
    readonly={disabled || undefined}
    {placeholder}
    aria-label={label}
    aria-invalid={invalid || undefined}
    spellcheck="false"
    autocomplete="off"
    autocapitalize="off"
    wrap={wrap ? 'soft' : 'off'}
    oninput={e => oninput(e.currentTarget.value)}
    onfocus={updateSelectionRects}
    onblur={() => {
      updateSelectionRects()
      onblur?.()
    }}
    onscroll={syncScroll}></textarea>
</code-editor-shell>

<style>
  code-editor-shell {
    position: relative;
    display: block;
    overflow: hidden;
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &:focus-within {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[data-invalid] {
      border-color: var(--foreground-destructive);
    }

    &[data-wrap] {
      textarea,
      code-editor-overlay {
        scrollbar-gutter: stable;
      }

      textarea,
      code-editor-overlay :global(pre) {
        white-space: pre-wrap;
        overflow-wrap: break-word;
      }
    }
  }

  textarea,
  code-editor-overlay :global(pre) {
    margin: 0;
    padding: var(--space-3xs) var(--space-2xs);
    font-family: var(--font-mono);
    font-size: var(--step--1);
    line-height: 1.5;
    tab-size: 2;
    white-space: pre;
  }

  textarea {
    position: relative;
    display: block;
    inline-size: 100%;
    min-block-size: 4.5rem;
    overflow: auto;
    color: var(--foreground-l0);
    background: transparent;
    border: none;
    outline: none;

    &[data-highlighted] {
      color: transparent;
      caret-color: var(--foreground-l0);

      /* the overlay draws the selection instead */
      &::selection {
        background: transparent;
      }
    }

    &::selection {
      background: color-mix(in srgb, var(--foreground-accent) 35%, transparent);
    }

    &::placeholder {
      color: var(--foreground-l4);
    }
  }

  code-editor-overlay {
    position: absolute;
    inset: 0;
    display: block;
    overflow: hidden;
    pointer-events: none;

    code-editor-selection {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      display: block;

      div {
        position: absolute;
        background: color-mix(
          in srgb,
          var(--foreground-accent) 35%,
          transparent
        );
      }
    }

    :global(pre) {
      background: transparent !important;
    }

    :global(.shiki),
    :global(.shiki span) {
      :global(:root[data-theme='dark']) & {
        color: var(--shiki-dark) !important;
      }

      @media (prefers-color-scheme: dark) {
        :global(:root:not([data-theme])) & {
          color: var(--shiki-dark) !important;
        }
      }
    }
  }
</style>
