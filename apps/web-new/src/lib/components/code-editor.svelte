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

  function syncScroll(event: Event) {
    if (!overlay) return
    const target = event.currentTarget as HTMLTextAreaElement
    overlay.scrollTop = target.scrollTop
    overlay.scrollLeft = target.scrollLeft
  }
</script>

<code-editor-shell data-invalid={invalid || undefined}>
  {#if html !== null}
    <code-editor-overlay {@attach captureOverlay} aria-hidden="true">
      {@html html}
    </code-editor-overlay>
  {/if}
  <textarea
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
    wrap="off"
    oninput={e => oninput(e.currentTarget.value)}
    {onblur}
    onscroll={syncScroll}
  ></textarea>
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
