<script lang="ts">
  import { Button, Card, SchemaForm, Section, Textarea } from '$lib/components'
  import * as yaml from 'yaml'
  import testData from './test-data.yaml?raw'
  import testSchema from './test-schema.yaml?raw'

  const schema = yaml.parse(testSchema)
  const defaultData = yaml.parse(testData)

  let value = $state<Record<string, unknown>>(structuredClone(defaultData))
  let showOutput = $state(false)

  function handleChange(newValue: Record<string, unknown>) {
    value = newValue
  }

  function reset() {
    value = structuredClone(defaultData)
  }

  function clear() {
    value = {}
  }
</script>

<svelte:head>
  <title>Schema Form Test</title>
</svelte:head>

<div class="mx-auto w-full max-w-3xl flex flex-col gap-6 p-6">
  <Card.Root>
    <Card.Content class="flex gap-2">
      <Button variant="outline" onclick={reset}>Reset to defaults</Button>
      <Button variant="outline" onclick={clear}>Clear all</Button>
      <Button variant="outline" onclick={() => (showOutput = !showOutput)}>
        {showOutput ? 'Hide' : 'Show'} output
      </Button>
    </Card.Content>
  </Card.Root>

  {#if showOutput}
    <Section.Root>
      <Section.Header>Current Value (YAML)</Section.Header>
      <Section.Content>
        <Textarea class="min-h-64 font-mono text-sm" value={yaml.stringify(value)} readonly />
      </Section.Content>
    </Section.Root>
  {/if}

  <SchemaForm {schema} {value} onChange={handleChange} />
</div>
