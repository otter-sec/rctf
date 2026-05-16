<script lang="ts">
  import { ExposeKind } from '@rctf/types'
  import { Button, Field, Input, Section, Select } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import type { Remote } from '$lib/machines'
  import { cn } from '$lib/utils'

  interface Props {
    remotes: Remote[]
    isDisabled: boolean
    onRemotesChange: (remotes: Remote[]) => void
  }

  let { remotes, isDisabled, onRemotesChange }: Props = $props()

  let selectedIndex = $state(0)

  $effect(() => {
    if (selectedIndex >= remotes.length) {
      selectedIndex = Math.max(0, remotes.length - 1)
    }
  })

  const selectedRemote = $derived(remotes[selectedIndex])

  function addRemote() {
    onRemotesChange([
      ...remotes,
      {
        kind: ExposeKind.HTTPS,
        host: '',
        port: 443,
      },
    ])
    selectedIndex = remotes.length
  }

  function removeRemote(i: number) {
    onRemotesChange(remotes.filter((_, j) => j !== i))
  }

  function updateRemote(i: number, partial: Partial<Remote>) {
    onRemotesChange(remotes.map((r, j) => (j === i ? { ...r, ...partial } : r)))
  }
</script>

<div class="flex flex-col gap-4">
  <Section.Root>
    <Section.Header>Remotes</Section.Header>
    <Section.Content class="@container/panel p-0">
      <div class="flex min-h-48 flex-col @md/panel:flex-row">
        <div
          class="flex w-full shrink-0 flex-col border-b-2 @md/panel:w-44 @md/panel:border-r-2 @md/panel:border-b-0"
        >
          <div class="sticky top-0 z-20">
            <div
              class="flex flex-row flex-wrap gap-1 overflow-hidden p-2 @md/panel:flex-col @md/panel:gap-0.5"
            >
              {#if remotes.length === 0}
                <p class="text-foreground-l4 px-2 py-1.5 text-sm">No remotes</p>
              {:else}
                {#each remotes as remote, i (i)}
                  {@const active = selectedIndex === i}
                  <div
                    class={cn(
                      'group flex max-w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm @md/panel:w-full @md/panel:gap-2',
                      active
                        ? 'bg-background-l4 text-foreground-l0'
                        : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'
                    )}
                    role="button"
                    tabindex="0"
                    onclick={() => (selectedIndex = i)}
                    onkeydown={e =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      (e.preventDefault(), (selectedIndex = i))}
                  >
                    <span class="truncate font-mono @md/panel:min-w-0 @md/panel:flex-1">
                      {remote.title || remote.host || `Remote ${i + 1}`}
                    </span>
                    <span class="text-foreground-l5 hidden shrink-0 text-xs @md/panel:block"
                      >{remote.kind}</span
                    >
                    <button
                      type="button"
                      class={cn(
                        'hover:bg-background-destructive hover:text-foreground-destructive shrink-0 rounded p-0.5',
                        active
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 @max-md/panel:opacity-100'
                      )}
                      onclick={e => (e.stopPropagation(), removeRemote(i))}
                      disabled={isDisabled}
                    >
                      <IconX class="size-3" />
                    </button>
                  </div>
                {/each}
              {/if}
            </div>
            <div class="shrink-0 border-t-2 p-2">
              <Button size="sm" class="w-full" onclick={addRemote} disabled={isDisabled}>
                <IconPlus class="size-4" />
                Add
              </Button>
            </div>
          </div>
        </div>
        <div class="min-w-0 flex-1 p-4">
          {#if selectedRemote}
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-1 gap-3 @xl/panel:grid-cols-2">
                <Field.Field>
                  <Field.Label>Protocol</Field.Label>
                  <Select.Root
                    type="single"
                    value={selectedRemote.kind}
                    onValueChange={v => updateRemote(selectedIndex, { kind: v as ExposeKind })}
                    disabled={isDisabled}
                  >
                    <Select.Trigger class="w-full">{selectedRemote.kind}</Select.Trigger>
                    <Select.Content>
                      {#each Object.values(ExposeKind) as kind}
                        <Select.Item value={kind} label={kind}>{kind}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </Field.Field>

                <Field.Field>
                  <Field.Label>Host</Field.Label>
                  <Input
                    type="text"
                    placeholder="example.com"
                    class="font-mono text-sm"
                    value={selectedRemote.host}
                    oninput={e => updateRemote(selectedIndex, { host: e.currentTarget.value })}
                    disabled={isDisabled}
                  />
                </Field.Field>

                <Field.Field>
                  <Field.Label>Port</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="443"
                    class="font-mono"
                    value={selectedRemote.port}
                    oninput={e => updateRemote(selectedIndex, { port: +e.currentTarget.value })}
                    disabled={isDisabled}
                  />
                </Field.Field>

                <Field.Field>
                  <Field.Label>Display title <Field.Hint>(optional)</Field.Hint></Field.Label>
                  <Input
                    type="text"
                    placeholder="Web interface"
                    class="text-sm"
                    value={selectedRemote.title ?? ''}
                    oninput={e =>
                      updateRemote(selectedIndex, {
                        title: e.currentTarget.value || undefined,
                      })}
                    disabled={isDisabled}
                  />
                </Field.Field>
              </div>
            </div>
          {:else}
            <div class="text-foreground-l4 flex h-full items-center justify-center text-sm">
              Add a remote to get started
            </div>
          {/if}
        </div>
      </div>
    </Section.Content>
  </Section.Root>
</div>
