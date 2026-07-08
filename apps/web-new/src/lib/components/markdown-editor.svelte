<script lang="ts">
  import CodeEditor from '$lib/components/code-editor.svelte'
  import Markdown from '$lib/components/markdown.svelte'

  interface Props {
    value: string
    disabled?: boolean
    rows?: number
    placeholder?: string
    invalid?: boolean
    oninput: (value: string) => void
    onblur?: () => void
  }

  let {
    value,
    disabled = false,
    rows = 12,
    placeholder,
    invalid = false,
    oninput,
    onblur,
  }: Props = $props()

  const id = $props.id()
  let mode = $state<'edit' | 'preview'>('edit')
  const modes = [
    { value: 'edit', label: 'Edit' },
    { value: 'preview', label: 'Preview' },
  ] as const
</script>

<markdown-editor>
  <editor-modes role="tablist" aria-label="Markdown editor mode">
    {#each modes as item (item.value)}
      <button
        type="button"
        role="tab"
        id="{id}-tab-{item.value}"
        aria-controls="{id}-panel-{item.value}"
        aria-selected={mode === item.value}
        data-selected={mode === item.value || undefined}
        onclick={() => (mode = item.value)}
      >
        {item.label}
      </button>
    {/each}
  </editor-modes>

  <editor-panel role="tabpanel" id="{id}-panel-{mode}" aria-labelledby="{id}-tab-{mode}">
    <editor-edit hidden={mode !== 'edit' || undefined}>
      <CodeEditor
        language="markdown"
        {value}
        {disabled}
        {rows}
        {placeholder}
        {invalid}
        {oninput}
        {onblur}
      />
    </editor-edit>
    {#if mode === 'preview'}
      <editor-preview>
        {#if value}
          <Markdown content={value} />
        {:else}
          <p data-empty>Nothing to preview.</p>
        {/if}
      </editor-preview>
    {/if}
  </editor-panel>
</markdown-editor>

<style>
  markdown-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  editor-modes {
    display: flex;
    gap: var(--space-3xs);

    button {
      padding: 0.25rem 0.75rem;
      color: var(--foreground-l2);
      font-size: var(--step--1);
      background: var(--background-l2);
      border-radius: var(--radius-md);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l0);
      }

      &[data-selected] {
        color: var(--foreground-l0);
        background: var(--background-l3);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
      }
    }
  }

  editor-panel {
    display: block;

    &:focus-visible {
      outline: none;
    }
  }

  editor-edit {
    display: block;
  }

  editor-preview {
    display: block;
    min-block-size: 4.5rem;
    padding: 1rem;
    background: var(--background-l2);
    border-radius: var(--radius-md);

    p[data-empty] {
      margin: 0;
      font-size: var(--step--1);
      color: var(--foreground-l4);
    }
  }
</style>
