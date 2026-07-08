<script lang="ts">
  import * as splitter from '@zag-js/splitter'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { createScrollGeometry, deriveEdgeFades } from '$lib/components/scroll-geometry.svelte'
  import Button from '$lib/ui/button.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import TreeView, { type TreeViewNode } from '$lib/ui/tree-view.svelte'
  import { setContext, tick, type Snippet } from 'svelte'
  import SchemaFormArrayList from './schema-form-array-list.svelte'
  import SchemaFormField from './schema-form-field.svelte'
  import SchemaFormObject from './schema-form-object.svelte'
  import SchemaFormRecordList from './schema-form-record-list.svelte'
  import {
    classifyHeavy,
    decodeNodeId,
    deriveTree,
    encodeNodeId,
    nearestSurvivingPath,
    pathStartsWith,
    remapPathForArrayRemoval,
    remapPathForRename,
    type TreeNode,
  } from './tree'
  import {
    SCHEMA_FORM_ERRORS_KEY,
    type JsonSchema,
    type SchemaFormErrorsContext,
    type SchemaFormFieldError,
  } from './types'
  import {
    collectDefs,
    getEffectiveSchema,
    getPrimaryType,
    isNullable,
    isRecordSchema,
    renameRecordEntry,
    resolveRefs,
    schemaAtPath,
    setValueAtPath,
    valueAtPath,
  } from './utils'
  import { pathStatuses, validateTree } from './validate-tree'

  interface Props {
    schema: JsonSchema
    value: Record<string, unknown>
    onChange: (next: Record<string, unknown>) => void
    valid?: boolean
    disabled?: boolean
    rootLabel?: string
    treeFooter?: Snippet
  }

  let {
    schema,
    value,
    onChange,
    valid = $bindable(true),
    disabled = false,
    rootLabel = 'Config',
    treeFooter,
  }: Props = $props()

  const resolvedSchema = $derived(resolveRefs(schema, collectDefs(schema)))
  const tree = $derived(deriveTree(resolvedSchema, value))
  const findings = $derived(validateTree(resolvedSchema, value))
  const statuses = $derived(pathStatuses(findings))

  $effect(() => {
    valid = findings.size === 0
  })

  const fieldErrors = $derived.by(() => {
    const map = new Map<string, SchemaFormFieldError>()
    for (const nodeFindings of findings.values()) {
      for (const finding of nodeFindings) {
        const id = encodeNodeId(finding.fieldPath)
        const existing = map.get(id)
        if (!existing || (existing.severity === 'missing' && finding.severity === 'invalid')) {
          map.set(id, { severity: finding.severity, message: finding.message })
        }
      }
    }
    return map
  })

  function findingAt(path: string[]): SchemaFormFieldError | null {
    const exact = fieldErrors.get(encodeNodeId(path))
    if (exact) return exact
    for (const [id, error] of fieldErrors) {
      const errorPath = decodeNodeId(id)
      if (errorPath.length <= path.length || !pathStartsWith(errorPath, path)) continue
      const segment = errorPath[path.length] ?? ''
      const position = /^\d+$/.test(segment) ? `Item ${Number(segment) + 1}` : segment
      return { severity: error.severity, message: `${position}: ${error.message}` }
    }
    return null
  }

  setContext<SchemaFormErrorsContext>(SCHEMA_FORM_ERRORS_KEY, {
    get: findingAt,
    status: path => statuses.get(encodeNodeId(path)),
    display: path => {
      const finding = findingAt(path)
      const incomplete = finding?.severity === 'missing'
      const redundant = incomplete && finding?.message === 'Required'
      return {
        error: !finding || redundant ? null : finding.message,
        incomplete,
      }
    },
  })

  let selected = $derived.by(() => {
    void schema
    return encodeNodeId([])
  })
  let expanded = $derived.by(() => {
    void schema
    return [encodeNodeId([])]
  })

  const nodeMap = $derived.by(() => {
    const map = new Map<string, TreeNode>()
    const visit = (node: TreeNode) => {
      map.set(node.id, node)
      for (const child of node.children) visit(child)
    }
    visit(tree)
    return map
  })

  const selectedId = $derived.by(() => {
    if (nodeMap.has(selected)) return selected
    let path = nearestSurvivingPath(decodeNodeId(selected), resolvedSchema, value)
    while (path.length > 0 && !nodeMap.has(encodeNodeId(path))) {
      path = path.slice(0, -1)
    }
    return encodeNodeId(path)
  })

  const hasTree = $derived(tree.children.length > 0)

  const viewNodes = $derived.by(() => {
    const toView = (node: TreeNode): TreeViewNode => {
      const view: TreeViewNode = {
        id: node.id,
        label: node.id === '' ? rootLabel : node.label,
      }
      if (node.summary) view.summary = node.summary
      const status = statuses.get(node.id)
      if (status) view.status = status
      if (node.children.length > 0) view.children = node.children.map(toView)
      return view
    }
    return [toView(tree)]
  })

  const selectedPath = $derived(decodeNodeId(selectedId))
  const selectedNode = $derived(nodeMap.get(selectedId) ?? null)
  const selectedSchema = $derived(schemaAtPath(resolvedSchema, selectedPath))
  const selectedEffective = $derived(selectedSchema ? getEffectiveSchema(selectedSchema) : null)
  const selectedValue = $derived(valueAtPath(value, selectedPath))
  const selectedKind = $derived(selectedSchema ? classifyHeavy(selectedSchema) : null)
  const selectedNullable = $derived(selectedSchema ? isNullable(selectedSchema) : false)

  const crumbs = $derived.by(() => {
    const items = [{ id: encodeNodeId([]), path: [] as string[], label: rootLabel, isNode: true }]
    for (let length = 1; length <= selectedPath.length; length++) {
      const path = selectedPath.slice(0, length)
      const id = encodeNodeId(path)
      const node = nodeMap.get(id)
      items.push({ id, path, label: node?.label ?? path[length - 1] ?? '', isNode: node != null })
    }
    return items
  })

  let detailEl = $state<HTMLElement | null>(null)
  let headingEl = $state<HTMLElement | null>(null)
  let treeEl = $state<HTMLElement | null>(null)

  const treeFades = deriveEdgeFades(createScrollGeometry(() => treeEl))
  const detailFades = deriveEdgeFades(createScrollGeometry(() => detailEl))

  const splitId = $props.id()
  const splitService = useMachine(splitter.machine, () => ({
    id: splitId,
    orientation: 'horizontal' as const,
    defaultSize: [30, 70],
    panels: [{ id: 'tree', minSize: 15, maxSize: 60 }, { id: 'detail' }],
  }))
  const splitApi = $derived(splitter.connect(splitService, normalizeProps))

  let detailEpoch = $state(0)

  $effect(() => {
    void selectedId
    if (detailEl) detailEl.scrollTop = 0
  })

  function focusDetail(target: 'heading' | 'key' | 'first-field') {
    void tick().then(() => {
      if (target === 'heading') {
        headingEl?.focus()
        return
      }
      if (target === 'key') {
        const keyInput = detailEl?.querySelector<HTMLElement>('key-rename input')
        if (keyInput) {
          keyInput.focus()
          return
        }
      }
      detailEl
        ?.querySelector<HTMLElement>('detail-body input, detail-body textarea, detail-body button')
        ?.focus()
    })
  }

  function revealAncestors(path: string[]) {
    const ids = new Set(expanded)
    for (let length = 0; length < path.length; length++) {
      ids.add(encodeNodeId(path.slice(0, length)))
    }
    expanded = [...ids]
  }

  function selectNode(path: string[]) {
    revealAncestors(path)
    selected = encodeNodeId(path)
    detailEpoch++
    focusDetail('heading')
  }

  function entryAdded(entryPath: string[], kind: 'record' | 'array') {
    revealAncestors(entryPath)
    selected = encodeNodeId(entryPath)
    detailEpoch++
    focusDetail(kind === 'record' ? 'key' : 'first-field')
  }

  function arrayEntryRemoved(arrayPath: string[], index: number) {
    const remapped = remapPathForArrayRemoval(decodeNodeId(selectedId), arrayPath, index)
    selected = encodeNodeId(remapped ?? arrayPath)
    detailEpoch++
    expanded = expanded.flatMap(id => {
      const next = remapPathForArrayRemoval(decodeNodeId(id), arrayPath, index)
      return next ? [encodeNodeId(next)] : []
    })
  }

  function recordEntryRemoved(recordPath: string[], key: string) {
    const removed = [...recordPath, key]
    if (pathStartsWith(decodeNodeId(selectedId), removed)) {
      selected = encodeNodeId(recordPath)
      detailEpoch++
    }
    expanded = expanded.filter(id => !pathStartsWith(decodeNodeId(id), removed))
  }

  function handleChange(path: string[], newValue: unknown) {
    onChange(setValueAtPath(value, path, newValue) as Record<string, unknown>)
  }

  function enableCollection() {
    handleChange(selectedPath, selectedKind === 'record' ? {} : [])
  }

  const parentSchema = $derived(
    selectedPath.length > 0 ? schemaAtPath(resolvedSchema, selectedPath.slice(0, -1)) : null
  )
  const renamableKey = $derived.by(() => {
    if (!parentSchema) return null
    const effective = getEffectiveSchema(parentSchema)
    if (!isRecordSchema(effective) || effective.propertyNames?.enum) return null
    return selectedPath[selectedPath.length - 1] ?? null
  })

  let keyNameInput = $derived(renamableKey ?? '')

  const keyError = $derived.by(() => {
    if (!renamableKey) return null
    const nextKey = keyNameInput.trim()
    if (!nextKey || nextKey === renamableKey) return null
    const parentValue = valueAtPath(value, selectedPath.slice(0, -1))
    if (parentValue && typeof parentValue === 'object' && Object.hasOwn(parentValue, nextKey)) {
      return `A "${nextKey}" entry already exists`
    }
    return null
  })

  function renameSelectedKey() {
    if (!renamableKey) return
    const oldKey = renamableKey
    const nextKey = keyNameInput.trim()
    const parentPath = selectedPath.slice(0, -1)
    const next = renameRecordEntry(valueAtPath(value, parentPath), oldKey, nextKey)
    if (!next) {
      keyNameInput = oldKey
      return
    }
    selected = encodeNodeId(remapPathForRename(selectedPath, parentPath, oldKey, nextKey))
    expanded = expanded.map(id =>
      encodeNodeId(remapPathForRename(decodeNodeId(id), parentPath, oldKey, nextKey))
    )
    onChange(setValueAtPath(value, parentPath, next) as Record<string, unknown>)
  }
</script>

{#snippet treePane()}
  <schema-form-tree>
    <tree-viewport>
      <tree-scroll bind:this={treeEl}>
        <TreeView
          nodes={viewNodes}
          bind:selected={
            () => selectedId,
            v => {
              if (v !== selectedId) detailEpoch++
              selected = v
            }
          }
          bind:expanded
          {disabled}
        />
      </tree-scroll>
      <EdgeFades top={treeFades.top} bottom={treeFades.bottom} />
    </tree-viewport>
    {#if treeFooter}
      <tree-footer>{@render treeFooter()}</tree-footer>
    {/if}
  </schema-form-tree>
{/snippet}

{#snippet detailPane()}
  <schema-form-detail>
    {#if hasTree}
      <nav aria-label="Configuration path">
        {#each crumbs as crumb, index (crumb.id)}
          {#if index > 0}<crumb-separator aria-hidden="true">/</crumb-separator>{/if}
          {#if index === crumbs.length - 1}
            <crumb-current bind:this={headingEl} tabindex="-1" aria-current="page">
              {crumb.label}
            </crumb-current>
          {:else if crumb.isNode}
            <button type="button" onclick={() => selectNode(crumb.path)} {disabled}>
              {crumb.label}
            </button>
          {:else}
            <crumb-segment>{crumb.label}</crumb-segment>
          {/if}
        {/each}
      </nav>
    {/if}

    <detail-viewport>
      <detail-scroll bind:this={detailEl}>
        {#key detailEpoch}
          {#if renamableKey !== null}
            <key-rename>
              <Field label="Key name" error={keyError}>
                {#snippet children({ id, describedBy })}
                  <Input
                    {id}
                    aria-describedby={describedBy}
                    type="text"
                    data-mono
                    bind:value={keyNameInput}
                    onblur={renameSelectedKey}
                    aria-invalid={keyError ? 'true' : undefined}
                    {disabled}
                  />
                {/snippet}
              </Field>
            </key-rename>
          {/if}

          <detail-body>
            {#if selectedSchema && selectedEffective}
              {#if selectedNode?.notConfigured && (selectedKind === 'record' || selectedKind === 'array')}
                <detail-gate>
                  <detail-gate-empty>Not configured</detail-gate-empty>
                  <Button size="sm" onclick={enableCollection} {disabled}>Enable</Button>
                </detail-gate>
              {:else if selectedKind === 'record'}
                <SchemaFormRecordList
                  schema={selectedEffective}
                  value={selectedValue}
                  path={selectedPath}
                  onChange={handleChange}
                  onOpen={selectNode}
                  onAdded={entryPath => entryAdded(entryPath, 'record')}
                  onRemoved={key => recordEntryRemoved(selectedPath, key)}
                  {disabled}
                />
              {:else if selectedKind === 'array'}
                <SchemaFormArrayList
                  schema={selectedEffective}
                  value={selectedValue}
                  path={selectedPath}
                  onChange={handleChange}
                  onOpen={selectNode}
                  onAdded={entryPath => entryAdded(entryPath, 'array')}
                  onRemoved={index => arrayEntryRemoved(selectedPath, index)}
                  {disabled}
                />
              {:else if getPrimaryType(selectedEffective) === 'object'}
                <SchemaFormObject
                  schema={selectedEffective}
                  value={selectedValue}
                  path={selectedPath}
                  onChange={handleChange}
                  onSelect={selectNode}
                  {disabled}
                  isNullable={selectedNullable}
                />
              {:else}
                <SchemaFormField
                  schema={selectedSchema}
                  value={selectedValue}
                  path={selectedPath}
                  onChange={handleChange}
                  onSelect={selectNode}
                  {disabled}
                  showLabel={false}
                />
              {/if}
            {/if}
          </detail-body>
        {/key}
      </detail-scroll>
      <EdgeFades top={detailFades.top} bottom={detailFades.bottom} />
    </detail-viewport>
  </schema-form-detail>
{/snippet}

{#if resolvedSchema.properties}
  <schema-form-root data-flat={hasTree ? undefined : ''}>
    {#if hasTree}
      <div {...splitApi.getRootProps()}>
        <div {...splitApi.getPanelProps({ id: 'tree' })}>
          {@render treePane()}
        </div>
        <div
          {...splitApi.getResizeTriggerProps({ id: 'tree:detail' })}
          aria-label="Resize tree"
        ></div>
        <div {...splitApi.getPanelProps({ id: 'detail' })}>
          {@render detailPane()}
        </div>
      </div>
    {:else}
      {@render detailPane()}
    {/if}
  </schema-form-root>
{:else}
  <schema-form-empty>Schema has no properties to render</schema-form-empty>
{/if}

<style>
  schema-form-root {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
  }

  [data-part='panel'] {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 0;
  }

  [data-part='resize-trigger'] {
    position: relative;
    inline-size: 2px;
    background: var(--border);
    transition: background-color 80ms ease;

    &::before {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline: -0.1875rem;
    }

    &:hover,
    &[data-dragging] {
      background: var(--foreground-l4);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 1px;
    }
  }

  schema-form-tree {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  tree-viewport,
  detail-viewport {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  tree-scroll {
    display: block;
    flex: 1;
    min-block-size: 0;
    padding: 0.5rem;
    overflow-y: auto;
    overscroll-behavior: none;
  }

  tree-footer {
    display: flex;
    flex: none;
    padding: 0.5rem;
    border-block-start: 2px solid var(--border);
  }

  schema-form-detail {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  detail-scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: 0.5rem 1rem;
    overflow-y: auto;
    overscroll-behavior: none;
  }

  nav {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3xs);
    padding: 0.5rem 1rem;
    color: var(--foreground-l3);
    font-size: var(--step--1);
    border-block-end: 2px solid var(--border);

    button {
      padding: 0;
      color: var(--foreground-l3);
      font: inherit;
      cursor: pointer;
      background: none;
      border: none;
      border-radius: var(--radius-sm);

      &:hover {
        color: var(--foreground-l1);
        text-decoration: underline;
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
      }
    }
  }

  crumb-separator {
    color: var(--foreground-l4);
    user-select: none;
  }

  crumb-current {
    color: var(--foreground-l1);
    border-radius: var(--radius-sm);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  key-rename {
    display: block;

    :global(input[data-mono]) {
      font-family: var(--font-mono);
    }
  }

  detail-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  detail-gate {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  detail-gate-empty {
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  schema-form-empty {
    display: block;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  @container challenge-details (width < 46rem) {
    schema-form-root {
      block-size: auto;
    }

    [data-part='root'] {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }

    [data-part='panel'] {
      flex: none !important;
      inline-size: 100% !important;
      min-inline-size: 0 !important;
      max-inline-size: none !important;
    }

    [data-part='resize-trigger'] {
      display: none;
    }

    schema-form-tree {
      border-block-end: 2px solid var(--border);
    }

    tree-scroll {
      max-block-size: 14rem;
    }

    detail-viewport {
      flex: none;
    }

    detail-scroll {
      flex: none;
      overflow-y: visible;
    }
  }
</style>
