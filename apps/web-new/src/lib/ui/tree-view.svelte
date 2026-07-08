<script lang="ts" module>
  export interface TreeViewNode {
    id: string
    label: string
    summary?: string
    status?: 'invalid' | 'incomplete'
    children?: TreeViewNode[]
  }
</script>

<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as treeView from '@zag-js/tree-view'
  import { IconChevronDown } from '$lib/icons'

  interface Props {
    nodes: TreeViewNode[]
    selected: string
    expanded?: string[]
    disabled?: boolean
    label?: string
  }

  let {
    nodes,
    selected = $bindable(),
    expanded = $bindable([]),
    disabled = false,
    label = 'Configuration tree',
  }: Props = $props()

  // NUL sentinel: never collides with consumer node ids (which may include '')
  const hiddenRootId = '\u0000'

  const toValue = (nodeId: string) => `#${nodeId}`
  const fromValue = (value: string) => value.slice(1)

  const collection = $derived(
    treeView.collection<TreeViewNode>({
      rootNode: { id: hiddenRootId, label: '', children: nodes },
      nodeToValue: node => toValue(node.id),
      nodeToString: node => node.label,
      nodeToChildren: node => node.children ?? [],
    })
  )

  const id = $props.id()
  const service = useMachine(treeView.machine, () => ({
    id,
    collection,
    selectionMode: 'single' as const,
    expandOnClick: false,
    translations: { treeLabel: label },
    selectedValue: [toValue(selected)],
    expandedValue: expanded.map(toValue),
    onSelectionChange(details: treeView.SelectionChangeDetails) {
      const next = details.selectedValue[0]
      if (next !== undefined) selected = fromValue(next)
    },
    onExpandedChange(details: treeView.ExpandedChangeDetails) {
      expanded = details.expandedValue.map(fromValue)
    },
  }))
  const api = $derived(treeView.connect(service, normalizeProps))
</script>

{#snippet rowContent(node: TreeViewNode, textProps: Record<string, unknown>)}
  <span {...textProps}>
    {node.label}
    {#if node.status === 'invalid'}
      <span data-visually-hidden>contains errors</span>
    {:else if node.status === 'incomplete'}
      <span data-visually-hidden>incomplete</span>
    {/if}
  </span>
  {#if node.summary}
    <tree-row-summary>{node.summary}</tree-row-summary>
  {/if}
  {#if node.status}
    <tree-row-status
      aria-hidden="true"
      title={node.status === 'invalid' ? 'Contains errors' : 'Required fields missing'}
    >
      {node.status === 'invalid' ? '!' : '●'}
    </tree-row-status>
  {/if}
{/snippet}

{#snippet treeNode(node: TreeViewNode, indexPath: number[])}
  {@const nodeProps = { node, indexPath }}
  {#if node.children && node.children.length > 0}
    <div {...api.getBranchProps(nodeProps)}>
      <div
        {...api.getBranchControlProps(nodeProps)}
        data-invalid={node.status === 'invalid' ? '' : undefined}
        data-incomplete={node.status === 'incomplete' ? '' : undefined}
      >
        <span {...api.getBranchTriggerProps(nodeProps)} aria-label="Toggle {node.label}">
          <span {...api.getBranchIndicatorProps(nodeProps)}>
            <IconChevronDown />
          </span>
        </span>
        {@render rowContent(node, api.getBranchTextProps(nodeProps) as Record<string, unknown>)}
      </div>
      <div {...api.getBranchContentProps(nodeProps)}>
        {#each node.children as child, index (child.id)}
          {@render treeNode(child, [...indexPath, index])}
        {/each}
      </div>
    </div>
  {:else}
    <div
      {...api.getItemProps(nodeProps)}
      data-invalid={node.status === 'invalid' ? '' : undefined}
      data-incomplete={node.status === 'incomplete' ? '' : undefined}
    >
      {@render rowContent(node, api.getItemTextProps(nodeProps) as Record<string, unknown>)}
    </div>
  {/if}
{/snippet}

<div {...api.getRootProps()} data-disabled={disabled ? '' : undefined}>
  <div {...api.getTreeProps()}>
    {#each nodes as node, index (node.id)}
      {@render treeNode(node, [index])}
    {/each}
  </div>
</div>

<style>
  [data-part='tree']:focus-visible {
    outline: none;
  }

  [data-part='branch-control'],
  [data-part='item'] {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    margin-block-end: 0.125rem;
    padding-block: 0.25rem;
    padding-inline-end: var(--space-2xs);
    padding-inline-start: calc(var(--space-3xs) + (var(--depth) - 1) * var(--space-s));
    font-size: var(--step--1);
    cursor: pointer;
    border-radius: var(--radius-sm);

    &:hover {
      background: var(--background-l3);
    }

    &:active:not(:has([data-part='branch-trigger']:active)),
    &[data-selected] {
      background: var(--background-l4);
    }

    &[data-selected] [data-part='branch-text'],
    &[data-selected] [data-part='item-text'] {
      color: var(--foreground-l0);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  [data-part='item'] {
    padding-inline-start: calc(
      var(--space-3xs) + (var(--depth) - 1) * var(--space-s) + 1.25rem + var(--space-3xs)
    );
  }

  [data-part='branch-trigger'] {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    color: var(--foreground-l3);
    cursor: pointer;
    border-radius: var(--radius-sm);

    &:hover {
      color: var(--foreground-l0);
      background: var(--background-l5);
    }
  }

  [data-part='branch-indicator'] {
    display: flex;
    flex: none;
    align-items: center;
    rotate: -90deg;
    transition: rotate 0.15s ease;

    &[data-state='open'] {
      rotate: 0deg;
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }
  }

  [data-part='branch-text'],
  [data-part='item-text'] {
    overflow: hidden;
    color: var(--foreground-l1);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  tree-row-summary {
    overflow: hidden;
    color: var(--foreground-l4);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  tree-row-status {
    flex: none;
    margin-inline-start: auto;
    font-size: 0.75em;
    line-height: 1;
  }

  [data-invalid] tree-row-status,
  [data-incomplete] tree-row-status {
    color: var(--foreground-destructive);
  }
</style>
