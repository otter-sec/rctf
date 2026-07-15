<script lang="ts">
  import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
  } from '@codemirror/commands'
  import { javascript } from '@codemirror/lang-javascript'
  import { markdown } from '@codemirror/lang-markdown'
  import { yaml } from '@codemirror/lang-yaml'
  import {
    indentOnInput,
    indentUnit,
    syntaxHighlighting,
  } from '@codemirror/language'
  import { Compartment, EditorState, type Extension } from '@codemirror/state'
  import {
    EditorView,
    keymap,
    placeholder as placeholderExt,
  } from '@codemirror/view'
  import { classHighlighter } from '@lezer/highlight'
  import { indentationMarkers } from '@replit/codemirror-indentation-markers'
  import { untrack } from 'svelte'

  interface Props {
    value: string
    language: string
    disabled: boolean
    rows?: number
    placeholder?: string
    label?: string
    invalid?: boolean
    wrap?: boolean
    indent?: boolean
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
    indent = false,
    oninput,
    onblur,
  }: Props = $props()

  let container = $state<HTMLElement | null>(null)
  let view = $state<EditorView | null>(null)
  const readOnly = new Compartment()
  const contentAttrs = new Compartment()

  function languageExtensions(): Extension[] {
    switch (language) {
      case 'yaml':
        return [yaml()]
      case 'javascript':
        return [javascript()]
      case 'typescript':
        return [javascript({ typescript: true })]
      case 'markdown':
        return [markdown()]
      default:
        return []
    }
  }

  function attributes(): Record<string, string> {
    return {
      spellcheck: 'false',
      autocapitalize: 'off',
      ...(label ? { 'aria-label': label } : {}),
      ...(invalid ? { 'aria-invalid': 'true' } : {}),
    }
  }

  $effect(() => {
    const parent = container
    if (!parent) {
      return
    }
    const instance = untrack(
      () =>
        new EditorView({
          parent,
          state: EditorState.create({
            doc: value,
            extensions: [
              history(),
              indentOnInput(),
              indentUnit.of('  '),
              EditorState.tabSize.of(2),
              keymap.of([
                ...(indent ? [indentWithTab] : []),
                ...defaultKeymap,
                ...historyKeymap,
              ]),
              ...languageExtensions(),
              syntaxHighlighting(classHighlighter),
              ...(wrap ? [EditorView.lineWrapping] : []),
              ...(indent
                ? [
                    indentationMarkers({
                      thickness: 1,
                      colors: {
                        light: 'var(--code-guide)',
                        dark: 'var(--code-guide)',
                        activeLight: 'var(--code-guide-active)',
                        activeDark: 'var(--code-guide-active)',
                      },
                    }),
                  ]
                : []),
              ...(placeholder ? [placeholderExt(placeholder)] : []),
              readOnly.of(EditorState.readOnly.of(disabled)),
              contentAttrs.of(EditorView.contentAttributes.of(attributes())),
              EditorView.updateListener.of(update => {
                if (update.docChanged) {
                  oninput(update.state.doc.toString())
                }
              }),
              EditorView.domEventHandlers({
                blur: () => onblur?.(),
              }),
            ],
          }),
        })
    )
    view = instance
    return () => {
      instance.destroy()
      view = null
    }
  })

  $effect(() => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  })

  $effect(() => {
    if (view && view.state.readOnly !== disabled) {
      view.dispatch({
        effects: readOnly.reconfigure(EditorState.readOnly.of(disabled)),
      })
    }
  })

  $effect(() => {
    const attrs = attributes()
    if (view) {
      view.dispatch({
        effects: contentAttrs.reconfigure(
          EditorView.contentAttributes.of(attrs)
        ),
      })
    }
  })
</script>

<code-editor-shell
  bind:this={container}
  data-invalid={invalid || undefined}
  style:--code-editor-block-size="calc({rows * 1.5}em + 2 * var(--space-3xs))"
></code-editor-shell>

<style>
  code-editor-shell {
    --code-guide: color-mix(in srgb, var(--foreground-l4) 40%, transparent);
    --code-guide-active: color-mix(
      in srgb,
      var(--foreground-l4) 70%,
      transparent
    );
    --code-key: #116329;
    --code-string: #0a3069;
    --code-literal: #0550ae;
    --code-keyword: #cf222e;
    --code-type: #953800;
    --code-comment: #6e7781;
    --code-link: #0969da;

    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: var(--step--1);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    :root[data-theme='dark'] & {
      --code-key: #7ee787;
      --code-string: #a5d6ff;
      --code-literal: #79c0ff;
      --code-keyword: #ff7b72;
      --code-type: #ffa657;
      --code-comment: #8b949e;
      --code-link: #58a6ff;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme]) & {
        --code-key: #7ee787;
        --code-string: #a5d6ff;
        --code-literal: #79c0ff;
        --code-keyword: #ff7b72;
        --code-type: #ffa657;
        --code-comment: #8b949e;
        --code-link: #58a6ff;
      }
    }

    &:focus-within {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[data-invalid] {
      border-color: var(--foreground-destructive);
    }

    :global(.cm-editor) {
      block-size: var(--code-editor-block-size);
      min-block-size: 4.5rem;
    }

    :global(.cm-editor.cm-focused) {
      outline: none;
    }

    :global(.cm-scroller) {
      font-family: var(--font-mono);
      line-height: 1.5;
    }

    :global(.cm-content) {
      padding: var(--space-3xs) 0;
      caret-color: var(--foreground-l0);
    }

    :global(.cm-line) {
      padding-inline: var(--space-2xs);
    }

    :global(.cm-content ::selection),
    :global(.cm-line::selection) {
      background: color-mix(in srgb, var(--foreground-accent) 35%, transparent);
    }

    :global(.cm-placeholder) {
      color: var(--foreground-l4);
    }

    :global(.tok-propertyName) {
      color: var(--code-key);
    }

    :global(.tok-string),
    :global(.tok-string2),
    :global(.tok-url) {
      color: var(--code-string);
    }

    :global(.tok-number),
    :global(.tok-bool),
    :global(.tok-atom),
    :global(.tok-literal) {
      color: var(--code-literal);
    }

    :global(.tok-keyword),
    :global(.tok-operatorKeyword) {
      color: var(--code-keyword);
    }

    :global(.tok-typeName),
    :global(.tok-className) {
      color: var(--code-type);
    }

    :global(.tok-comment),
    :global(.tok-meta) {
      color: var(--code-comment);
    }

    :global(.tok-link) {
      color: var(--code-link);
      text-decoration: underline;
    }

    :global(.tok-heading) {
      font-weight: 700;
    }

    :global(.tok-emphasis) {
      font-style: italic;
    }

    :global(.tok-strong) {
      font-weight: 700;
    }

    :global(.tok-invalid) {
      color: var(--foreground-destructive);
    }
  }
</style>
