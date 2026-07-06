<!--
  Exposed-ports editor for the instancer tab. A master-detail list: the sidebar
  lists each port with an Add button and per-row remove; the detail panel edits
  the selected port's protocol, host prefix, container name/port, display title,
  and player visibility. All mutations run through the immutable helpers in
  `instancer-config` and bubble the whole array up via `onChange` — the pane
  keeps only the selected index locally.
-->
<script lang="ts">
  import { ExposeKind } from '@rctf/types'
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconX from '$lib/icons/icon-x.svelte'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import { addExpose, removeExpose, updateExpose, type ExposeConfig } from './instancer-config'

  interface Props {
    expose: ExposeConfig[]
    disabled: boolean
    onChange: (expose: ExposeConfig[]) => void
  }

  let { expose, disabled, onChange }: Props = $props()

  let selected = $state(0)
  const index = $derived(Math.min(selected, Math.max(0, expose.length - 1)))
  const current = $derived(expose[index])

  const protocolItems = $derived<MenuItem[]>(
    Object.values(ExposeKind)
      .filter(kind => kind !== ExposeKind.RAW)
      .map(kind => ({
        value: kind,
        label: kind,
        checked: current?.kind === kind,
        onSelect: () => patch({ kind }),
      }))
  )

  const visibilityItems = $derived<MenuItem[]>([
    {
      value: 'visible',
      label: 'Visible to players',
      checked: current?.shouldDisplay ?? true,
      onSelect: () => patch({ shouldDisplay: true }),
    },
    {
      value: 'hidden',
      label: 'Hidden from players',
      checked: !(current?.shouldDisplay ?? true),
      onSelect: () => patch({ shouldDisplay: false }),
    },
  ])

  function add() {
    onChange(addExpose(expose))
    selected = expose.length
  }

  function remove(target: number) {
    onChange(removeExpose(expose, target))
  }

  function patch(fields: Partial<ExposeConfig>) {
    onChange(updateExpose(expose, index, fields))
  }
</script>

{#snippet fieldSelect(label: string, items: MenuItem[])}
  {#if disabled}
    <button type="button" data-field-trigger data-disabled disabled>
      {label}<IconChevronDown />
    </button>
  {:else}
    <Menu {label} {items}>
      {#snippet trigger({ props })}
        <button type="button" data-field-trigger {...props}>
          {label}<IconChevronDown />
        </button>
      {/snippet}
    </Menu>
  {/if}
{/snippet}

<expose-editor>
  <expose-list>
    <expose-items>
      {#if expose.length === 0}
        <expose-empty>No ports</expose-empty>
      {:else}
        {#each expose as port, i (i)}
          <expose-item
            data-active={i === index ? '' : undefined}
            role="button"
            tabindex="0"
            onclick={() => (selected = i)}
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                selected = i
              }
            }}
          >
            <expose-name>{port.hostPrefix || `Port ${i + 1}`}</expose-name>
            <expose-kind>{port.kind}</expose-kind>
            {#if !disabled}
              <button
                type="button"
                aria-label="Remove port {i + 1}"
                onclick={e => {
                  e.stopPropagation()
                  remove(i)
                }}
              >
                <IconX />
              </button>
            {/if}
          </expose-item>
        {/each}
      {/if}
    </expose-items>
    {#if !disabled}
      <expose-add>
        <Button size="sm" onclick={add}>Add</Button>
      </expose-add>
    {/if}
  </expose-list>

  <expose-detail>
    {#if current}
      <field-grid>
        <form-field>
          <field-label>Protocol</field-label>
          {@render fieldSelect(current.kind, protocolItems)}
        </form-field>

        <form-field>
          <field-label>Host prefix</field-label>
          <Input
            type="text"
            data-mono
            placeholder="my-challenge"
            value={current.hostPrefix}
            {disabled}
            oninput={e => patch({ hostPrefix: e.currentTarget.value })}
          />
        </form-field>

        <form-field>
          <field-label>Container name</field-label>
          <Input
            type="text"
            data-mono
            placeholder="app"
            value={current.containerName}
            {disabled}
            oninput={e => patch({ containerName: e.currentTarget.value })}
          />
        </form-field>

        <form-field>
          <field-label>Container port</field-label>
          <Input
            type="number"
            data-mono
            min={1}
            max={65535}
            placeholder="80"
            value={current.containerPort}
            {disabled}
            oninput={e => patch({ containerPort: +e.currentTarget.value })}
          />
        </form-field>

        <form-field>
          <field-label>Display title <field-hint>(optional)</field-hint></field-label>
          <Input
            type="text"
            placeholder="Web interface"
            value={current.title ?? ''}
            {disabled}
            oninput={e => patch({ title: e.currentTarget.value || undefined })}
          />
        </form-field>

        <form-field>
          <field-label>Visibility</field-label>
          {@render fieldSelect(
            (current.shouldDisplay ?? true) ? 'Visible to players' : 'Hidden from players',
            visibilityItems
          )}
        </form-field>
      </field-grid>
    {:else}
      <expose-placeholder>Add a port to get started</expose-placeholder>
    {/if}
  </expose-detail>
</expose-editor>

<style>
  expose-editor {
    display: flex;
    flex-direction: column;
    min-block-size: 12rem;
    overflow: clip;
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    @media (width >= 40rem) {
      flex-direction: row;
    }
  }

  expose-list {
    display: flex;
    flex-direction: column;
    border-block-end: 2px solid var(--border);

    @media (width >= 40rem) {
      inline-size: 11rem;
      flex-shrink: 0;
      border-block-end: none;
      border-inline-end: 2px solid var(--border);
    }
  }

  expose-items {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-3xs);
    padding: var(--space-2xs);

    @media (width >= 40rem) {
      flex-direction: column;
    }
  }

  expose-empty {
    padding: var(--space-2xs);
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  expose-item {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    max-inline-size: 100%;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);
    cursor: pointer;
    border-radius: var(--radius-sm);

    @media (width >= 40rem) {
      inline-size: 100%;
    }

    &:hover {
      background: var(--background-l3);
      color: var(--foreground-l1);
    }

    &[data-active] {
      background: var(--background-l4);
      color: var(--foreground-l0);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    button {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--foreground-l4);
      cursor: pointer;
      border-radius: var(--radius-sm);

      &:hover {
        color: var(--foreground-destructive);
      }

      :global(svg) {
        inline-size: 0.875rem;
        block-size: 0.875rem;
      }
    }
  }

  expose-name {
    overflow: hidden;
    flex: 1;
    min-inline-size: 0;
    font-family: var(--font-mono);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  expose-kind {
    flex-shrink: 0;
    color: var(--foreground-l4);
    font-size: var(--step--2);
  }

  expose-add {
    padding: var(--space-2xs);
    border-block-start: 2px solid var(--border);

    :global(button[data-variant]) {
      inline-size: 100%;
    }
  }

  expose-detail {
    flex: 1;
    min-inline-size: 0;
    padding: var(--space-s);
  }

  expose-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 100%;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  field-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    @media (width >= 48rem) {
      grid-template-columns: 1fr 1fr;
    }
  }

  form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;
  }

  field-label {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    font-size: var(--step--1);
    color: var(--foreground-l2);
  }

  field-hint {
    color: var(--foreground-l4);
  }

  :global(input[data-mono]) {
    font-family: var(--font-mono);
  }

  [data-field-trigger] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    text-align: start;
    cursor: pointer;
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[data-disabled] {
      cursor: default;
      opacity: 0.5;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--foreground-l3);
    }
  }
</style>
