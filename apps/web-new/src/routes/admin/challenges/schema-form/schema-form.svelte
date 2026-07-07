<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import TreeView, { type TreeViewNode } from '$lib/ui/tree-view.svelte'
  import { setContext, tick, untrack } from 'svelte'
  import SchemaFormArrayList from './schema-form-array-list.svelte'
  import SchemaFormObject from './schema-form-object.svelte'
  import SchemaFormRecordList from './schema-form-record-list.svelte'
  import {
    classifyHeavy,
    decodeNodeId,
    deriveTree,
    encodeNodeId,
    nearestSurvivingPath,
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
  }

  let {
    schema,
    value,
    onChange,
    valid = $bindable(true),
    disabled = false,
    rootLabel = 'Config',
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

  setContext<SchemaFormErrorsContext>(SCHEMA_FORM_ERRORS_KEY, {
    get: path => fieldErrors.get(encodeNodeId(path)) ?? null,
    status: path => statuses.get(encodeNodeId(path)),
  })

  // Selection/expansion reset to the root view whenever the schema identity changes (KTD-5)
  let selected = $derived.by(() => {
    void schema
    return encodeNodeId([])
  })
  let expanded = $derived.by(() => {
    void schema
    return untrack(() => [tree.id])
  })

  const nodeIds = $derived.by(() => {
    const ids = new Set<string>()
    const visit = (node: TreeNode) => {
      ids.add(node.id)
      for (const child of node.children) visit(child)
    }
    visit(tree)
    return ids
  })

  // Falls back to the nearest surviving tree node when the selected path stops resolving
  const selectedId = $derived.by(() => {
    if (nodeIds.has(selected)) return selected
    let path = nearestSurvivingPath(decodeNodeId(selected), resolvedSchema, value)
    while (path.length > 0 && !nodeIds.has(encodeNodeId(path))) {
      path = path.slice(0, -1)
    }
    return encodeNodeId(path)
  })

  $effect(() => {
    if (selected !== selectedId) selected = selectedId
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

  function findNode(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) return node
    for (const child of node.children) {
      const found = findNode(child, id)
      if (found) return found
    }
    return null
  }

  const selectedPath = $derived(decodeNodeId(selectedId))
  const selectedNode = $derived(findNode(tree, selectedId))
  const selectedSchema = $derived(schemaAtPath(resolvedSchema, selectedPath))
  const selectedEffective = $derived(selectedSchema ? getEffectiveSchema(selectedSchema) : null)
  const selectedValue = $derived(valueAtPath(value, selectedPath))
  const selectedKind = $derived(selectedSchema ? classifyHeavy(selectedSchema) : null)
  const selectedNullable = $derived(selectedSchema ? isNullable(selectedSchema) : false)
  const headingLabel = $derived(selectedId === '' ? rootLabel : (selectedNode?.label ?? ''))

  let detailEl = $state<HTMLElement | null>(null)
  let headingEl = $state<HTMLElement | null>(null)

  // The detail pane scrolls independently and resets its own scroll on selection change (KTD-11)
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
    focusDetail('heading')
  }

  function entryAdded(entryPath: string[], kind: 'record' | 'array') {
    revealAncestors(entryPath)
    selected = encodeNodeId(entryPath)
    focusDetail(kind === 'record' ? 'key' : 'first-field')
  }

  function isPrefixOf(prefix: string[], path: string[]): boolean {
    return prefix.length <= path.length && prefix.every((segment, i) => path[i] === segment)
  }

  function arrayEntryRemoved(arrayPath: string[], index: number) {
    const remapped = remapPathForArrayRemoval(decodeNodeId(selected), arrayPath, index)
    selected = encodeNodeId(remapped ?? arrayPath)
    expanded = expanded.flatMap(id => {
      const next = remapPathForArrayRemoval(decodeNodeId(id), arrayPath, index)
      return next ? [encodeNodeId(next)] : []
    })
  }

  function recordEntryRemoved(recordPath: string[], key: string) {
    const removed = [...recordPath, key]
    if (isPrefixOf(removed, decodeNodeId(selected))) selected = encodeNodeId(recordPath)
    expanded = expanded.filter(id => !isPrefixOf(removed, decodeNodeId(id)))
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

{#if resolvedSchema.properties}
  <schema-form-root data-flat={hasTree ? undefined : ''}>
    {#if hasTree}
      <schema-form-tree>
        <TreeView nodes={viewNodes} bind:selected bind:expanded {disabled} />
      </schema-form-tree>
    {/if}

    <schema-form-detail bind:this={detailEl}>
      {#if hasTree}
        <h4 bind:this={headingEl} tabindex="-1">{headingLabel}</h4>
      {/if}

      {#key selectedId}
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
            {:else}
              <SchemaFormObject
                schema={selectedEffective}
                value={selectedValue}
                path={selectedPath}
                onChange={handleChange}
                onSelect={selectNode}
                {disabled}
                isNullable={selectedNullable}
              />
            {/if}
          {/if}
        </detail-body>
      {/key}
    </schema-form-detail>
  </schema-form-root>
{:else}
  <schema-form-empty>Schema has no properties to render</schema-form-empty>
{/if}

<style>
  schema-form-root {
    display: grid;
    grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
    gap: var(--space-s);
    align-items: start;

    &[data-flat] {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  schema-form-tree {
    display: block;
    min-block-size: 0;
    max-block-size: min(70vh, 44rem);
    padding: var(--space-3xs);
    overflow-y: auto;
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
  }

  schema-form-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    max-block-size: min(70vh, 44rem);
    overflow-y: auto;

    schema-form-root[data-flat] & {
      max-block-size: none;
      overflow-y: visible;
    }
  }

  h4 {
    margin: 0;
    color: var(--foreground-l1);
    font-size: var(--step--1);
    font-weight: 600;

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
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
      grid-template-columns: minmax(0, 1fr);
    }

    schema-form-tree {
      max-block-size: 14rem;
    }
  }
</style>
