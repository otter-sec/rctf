<script lang="ts">
  import { ExposeKind } from '@rctf/types'
  import type { InstancerConfig } from '$lib/api'
  import {
    Button,
    Field,
    Input,
    ScrollArea,
    Section,
    Select,
    Textarea,
  } from '$lib/components'
  import { IconPlus, IconTrashFilled, IconX } from '$lib/icons'

  interface Props {
    config: InstancerConfig | null
    isDisabled: boolean
    onConfigChange: (config: InstancerConfig | null) => void
  }

  let { config, isDisabled, onConfigChange }: Props = $props()

  type Container = InstancerConfig['pods'][number]
  type Expose = InstancerConfig['expose'][number]

  const NANO_PER_CORE = 1e9
  const MB = 1024 * 1024

  let selected = $state('')

  $effect(() => {
    if (!config) return
    if (!selected || !config.pods.some(c => c.name === selected)) {
      selected = config.pods[0]?.name ?? ''
    }
  })

  const current = $derived(config?.pods.find(c => c.name === selected))

  const csv = {
    parse: (s: string) => s.split(',').map(x => x.trim()).filter(Boolean),
    format: (a: string[]) => a.join(', '),
  }

  const env = {
    parse: (s: string): Record<string, string> =>
      Object.fromEntries(
        s.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
          .filter(([k]) => k)
      ),
    format: (e: Record<string, string>) =>
      Object.entries(e).map(([k, v]) => `${k}=${v}`).join('\n'),
  }

  function update(fn: (c: InstancerConfig) => InstancerConfig) {
    if (config) onConfigChange(fn(config))
  }

  function updatePod(fn: (p: Container) => Container) {
    if (!selected) return
    update(c => ({ ...c, pods: c.pods.map(p => p.name === selected ? fn(p) : p) }))
  }

  function defaultContainer(name: string): Container {
    return {
      name,
      image: '',
      env: {},
      egress: false,
      security: {
        readOnlyFs: true,
        dockerSecurityOpt: ['no-new-privileges'],
        capAdd: [],
        capDrop: ['ALL'],
      },
      limits: {
        memoryBytes: 6 * MB,
        cpusNano: NANO_PER_CORE,
        pidsLimit: 1024,
        ulimits: [{ name: 'nofile', soft: 1024, hard: 1024 }],
      },
    }
  }

  function defaultConfig(): InstancerConfig {
    return {
      challengeIntegrationId: '',
      pods: [{ ...defaultContainer('app'), image: 'traefik/whoami:latest' }],
      expose: [{ kind: ExposeKind.HTTPS, podName: 'app', podPort: 80 }],
      timeoutMilliseconds: 120000,
    }
  }

  function addContainer() {
    const names = new Set(config?.pods.map(c => c.name))
    let n = 1
    while (names.has(`container-${n}`)) n++
    const name = `container-${n}`
    update(c => ({ ...c, pods: [...c.pods, defaultContainer(name)] }))
    selected = name
  }

  function removeContainer(name: string) {
    if (!config || config.pods.length <= 1) return
    const idx = config.pods.findIndex(c => c.name === name)
    update(c => ({
      ...c,
      pods: c.pods.filter(p => p.name !== name),
      expose: c.expose.filter(e => e.podName !== name),
    }))
    if (selected === name) {
      selected = config.pods[idx === 0 ? 1 : idx - 1]?.name ?? ''
    }
  }

  function addExpose() {
    if (!config?.pods[0]) return
    update(c => ({
      ...c,
      expose: [...c.expose, { kind: ExposeKind.HTTPS, podName: c.pods[0]!.name, podPort: 80 }],
    }))
  }

  function removeExpose(i: number) {
    update(c => ({ ...c, expose: c.expose.filter((_, j) => j !== i) }))
  }

  function updateExpose(i: number, partial: Partial<Expose>) {
    update(c => ({
      ...c,
      expose: c.expose.map((e, j) => j === i ? { ...e, ...partial } : e),
    }))
  }
</script>

<div class="flex flex-col gap-4">
  <Section.Root>
    <Section.Header>Configuration</Section.Header>
    <Section.Content class="flex flex-col gap-4">
      <Field.Field>
        <Field.Label>Enable instancer</Field.Label>
        <Select.Root
          type="single"
          value={config ? 'yes' : 'no'}
          onValueChange={v => onConfigChange(v === 'yes' ? defaultConfig() : null)}
          disabled={isDisabled}
        >
          <Select.Trigger class="w-full">
            {config ? 'Enabled' : 'Disabled'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="no" label="Disabled">Disabled</Select.Item>
            <Select.Item value="yes" label="Enabled">Enabled</Select.Item>
          </Select.Content>
        </Select.Root>
      </Field.Field>

      {#if config}
        <div class="grid grid-cols-2 gap-4">
          <Field.Field>
            <Field.Label>Integration ID</Field.Label>
            <Input
              type="text"
              placeholder="challenge-id"
              class="font-mono"
              value={config.challengeIntegrationId}
              oninput={e => update(c => ({ ...c, challengeIntegrationId: e.currentTarget.value }))}
              disabled={isDisabled}
            />
          </Field.Field>
          <Field.Field>
            <Field.Label>Timeout <Field.Hint>(seconds)</Field.Hint></Field.Label>
            <Input
              type="number"
              min={0}
              value={Math.round(config.timeoutMilliseconds / 1000)}
              oninput={e => update(c => ({ ...c, timeoutMilliseconds: +e.currentTarget.value * 1000 }))}
              disabled={isDisabled}
            />
          </Field.Field>
        </div>
      {/if}
    </Section.Content>
  </Section.Root>

  {#if config}
    <Section.Root>
      <Section.Header>Containers</Section.Header>
      <Section.Content class="p-0">
        <div class="flex">
          <div class="relative w-44 shrink-0 border-r-2">
            <div class="absolute inset-0 flex flex-col">
              <ScrollArea class="min-h-0 flex-1" fadeColor="background-l2">
                <div class="flex flex-col gap-0.5 p-2">
                  {#each config.pods as pod (pod.name)}
                    {@const active = selected === pod.name}
                    <div
                      class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm
                        {active ? 'bg-background-l4 text-foreground-l0' : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'}"
                      role="button"
                      tabindex="0"
                      onclick={() => (selected = pod.name)}
                      onkeydown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selected = pod.name)}
                    >
                      <span class="flex-1 truncate font-mono">{pod.name}</span>
                      {#if config.pods.length > 1}
                        <button
                          type="button"
                          class="rounded p-0.5 hover:bg-background-destructive hover:text-foreground-destructive
                            {active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
                          onclick={e => (e.stopPropagation(), removeContainer(pod.name))}
                          disabled={isDisabled}
                        >
                          <IconX class="size-3" />
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>
              </ScrollArea>
              <div class="shrink-0 border-t-2 p-2">
                <Button size="sm" class="w-full" onclick={addContainer} disabled={isDisabled}>
                  <IconPlus class="size-4" />
                  Add container
                </Button>
              </div>
            </div>
          </div>

          <div class="flex-1 p-4">
            {#if current}
              {@const limits = current.limits}
              {@const security = current.security}
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                  <Field.Field>
                    <Field.Label>Name</Field.Label>
                    <Input
                      type="text"
                      class="font-mono"
                      value={current.name}
                      oninput={e => {
                        const name = e.currentTarget.value
                        updatePod(p => ({ ...p, name }))
                        selected = name
                      }}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Image</Field.Label>
                    <Input
                      type="text"
                      placeholder="image:tag"
                      class="font-mono"
                      value={current.image}
                      oninput={e => updatePod(p => ({ ...p, image: e.currentTarget.value }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                </div>

                <span class="border-b-2 pb-2 text-sm font-medium text-foreground-l3">Resources</span>
                <div class="grid grid-cols-4 gap-4">
                  <Field.Field>
                    <Field.Label>Memory <Field.Hint>(MB)</Field.Hint></Field.Label>
                    <Input
                      type="number"
                      min={1}
                      value={Math.round(limits.memoryBytes / MB)}
                      oninput={e => updatePod(p => ({ ...p, limits: { ...p.limits, memoryBytes: +e.currentTarget.value * MB } }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>CPU <Field.Hint>(cores)</Field.Hint></Field.Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={limits.cpusNano / NANO_PER_CORE}
                      oninput={e => updatePod(p => ({ ...p, limits: { ...p.limits, cpusNano: Math.round(+e.currentTarget.value * NANO_PER_CORE) } }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>PIDs <Field.Hint>(limit)</Field.Hint></Field.Label>
                    <Input
                      type="number"
                      min={1}
                      value={limits.pidsLimit}
                      oninput={e => updatePod(p => ({ ...p, limits: { ...p.limits, pidsLimit: +e.currentTarget.value } }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Egress</Field.Label>
                    <Select.Root
                      type="single"
                      value={current.egress ? 'yes' : 'no'}
                      onValueChange={v => updatePod(p => ({ ...p, egress: v === 'yes' }))}
                      disabled={isDisabled}
                    >
                      <Select.Trigger class="w-full">{current.egress ? 'Allowed' : 'Blocked'}</Select.Trigger>
                      <Select.Content>
                        <Select.Item value="yes" label="Allowed">Allowed</Select.Item>
                        <Select.Item value="no" label="Blocked">Blocked</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>
                </div>

                <span class="border-b-2 pb-2 text-sm font-medium text-foreground-l3">Security</span>
                <div class="grid grid-cols-2 gap-4">
                  <Field.Field>
                    <Field.Label>Read-only FS</Field.Label>
                    <Select.Root
                      type="single"
                      value={security.readOnlyFs ? 'yes' : 'no'}
                      onValueChange={v => updatePod(p => ({ ...p, security: { ...p.security, readOnlyFs: v === 'yes' } }))}
                      disabled={isDisabled}
                    >
                      <Select.Trigger class="w-full">{security.readOnlyFs ? 'Yes' : 'No'}</Select.Trigger>
                      <Select.Content>
                        <Select.Item value="yes" label="Yes">Yes</Select.Item>
                        <Select.Item value="no" label="No">No</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Security opts</Field.Label>
                    <Input
                      type="text"
                      placeholder="no-new-privileges, ..."
                      class="font-mono"
                      value={csv.format(security.dockerSecurityOpt)}
                      oninput={e => updatePod(p => ({ ...p, security: { ...p.security, dockerSecurityOpt: csv.parse(e.currentTarget.value) } }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Cap add</Field.Label>
                    <Input
                      type="text"
                      placeholder="CAP_NET_ADMIN, ..."
                      class="font-mono"
                      value={csv.format(security.capAdd)}
                      oninput={e => updatePod(p => ({ ...p, security: { ...p.security, capAdd: csv.parse(e.currentTarget.value) } }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Cap drop</Field.Label>
                    <Input
                      type="text"
                      placeholder="ALL, ..."
                      class="font-mono"
                      value={csv.format(security.capDrop)}
                      oninput={e => updatePod(p => ({ ...p, security: { ...p.security, capDrop: csv.parse(e.currentTarget.value) } }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                </div>

                <Field.Field>
                  <Field.Label>Environment <Field.Hint>(one per line)</Field.Hint></Field.Label>
                  <Textarea
                    placeholder="KEY=value"
                    class="font-mono text-sm"
                    rows={3}
                    value={env.format(current.env)}
                    oninput={e => updatePod(p => ({ ...p, env: env.parse(e.currentTarget.value) }))}
                    disabled={isDisabled}
                  />
                </Field.Field>
              </div>
            {:else}
              <div class="flex h-full items-center justify-center text-sm text-foreground-l4">
                Select a container to view details
              </div>
            {/if}
          </div>
        </div>
      </Section.Content>
    </Section.Root>

    <Section.Root>
      <Section.Header class="flex items-center justify-between">
        <span>Exposed ports</span>
        <Button size="sm" onclick={addExpose} disabled={isDisabled || !config.pods.length}>
          <IconPlus class="size-4" />
          Add
        </Button>
      </Section.Header>
      {#if config.expose.length}
        <div class="divide-y divide-border">
          {#each config.expose as exp, i (i)}
            <div class="flex items-center gap-3 px-4 py-2">
              <Select.Root
                type="single"
                value={exp.kind}
                onValueChange={v => updateExpose(i, { kind: v as ExposeKind })}
                disabled={isDisabled}
              >
                <Select.Trigger class="w-24">{exp.kind}</Select.Trigger>
                <Select.Content>
                  {#each Object.values(ExposeKind) as kind}
                    <Select.Item value={kind} label={kind}>{kind}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>

              <span class="text-foreground-l4">→</span>

              <Select.Root
                type="single"
                value={exp.podName}
                onValueChange={v => updateExpose(i, { podName: v })}
                disabled={isDisabled}
              >
                <Select.Trigger class="w-32 font-mono">{exp.podName}</Select.Trigger>
                <Select.Content>
                  {#each config.pods as pod}
                    <Select.Item value={pod.name} label={pod.name}>{pod.name}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>

              <span class="text-foreground-l4">:</span>

              <Input
                type="number"
                min={1}
                max={65535}
                placeholder="Port"
                class="w-20"
                value={exp.podPort}
                oninput={e => updateExpose(i, { podPort: +e.currentTarget.value })}
                disabled={isDisabled}
              />

              <div class="flex-1"></div>

              <Button
                variant="destructive"
                size="icon-sm"
                onclick={() => removeExpose(i)}
                disabled={isDisabled}
              >
                <IconTrashFilled class="size-4 text-destructive" />
              </Button>
            </div>
          {/each}
        </div>
      {:else}
        <Section.Content>
          <p class="text-sm text-foreground-l4">No exposed ports configured.</p>
        </Section.Content>
      {/if}
    </Section.Root>
  {/if}
</div>
