<script lang="ts">
  import { Section } from '$lib/components'
  import type { Snippet } from 'svelte'

  interface Props {
    label: string
    sidebar: Snippet
    footer: Snippet
    content: Snippet
  }

  let { label, sidebar, footer, content }: Props = $props()
</script>

<Section.Root>
  <Section.Header>{label}</Section.Header>
  <Section.Content class="p-0">
    <div class="flex min-h-48">
      <div class="flex w-44 shrink-0 flex-col border-r-2">
        <div class="sticky top-0 z-10">
        <div class="flex flex-col gap-0.5 p-2">
          {@render sidebar()}
        </div>
        <div class="shrink-0 border-t-2 p-2">
          {@render footer()}
        </div>
        </div>
      </div>
      <div class="flex-1 p-4">
        {@render content()}
      </div>
    </div>
  </Section.Content>
</Section.Root>
