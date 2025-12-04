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

  const arrayToString = (arr: string[]) => arr.join(', ')
  const stringToArray = (str: string) =>
    str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

  interface Props {
    config: InstancerConfig | null
    isDisabled: boolean
    onConfigChange: (config: InstancerConfig | null) => void
  }

  let { config, isDisabled, onConfigChange }: Props = $props()

  const isEnabled = $derived(config !== null)
  let selectedContainer: string = $state('')

  const NANO_PER_CORE = 1_000_000_000

  type Container = InstancerConfig['pods'][number]
  type Expose = InstancerConfig['expose'][number]

  $effect(() => {
    if (
      config &&
      (!selectedContainer ||
        !config.pods.find(c => c.name === selectedContainer))
    ) {
      selectedContainer = config.pods[0]?.name ?? ''
    }
  })

  const currentContainer = $derived(
    config?.pods.find(c => c.name === selectedContainer)
  )

  function getDefaultContainer(name: string): Container {
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
        memoryBytes: 6291456,
        cpusNano: NANO_PER_CORE,
        pidsLimit: 1024,
        ulimits: [{ name: 'nofile', soft: 1024, hard: 1024 }],
      },
    }
  }

  function getDefaultConfig(): InstancerConfig {
    return {
      challengeIntegrationId: '',
      pods: [{ ...getDefaultContainer('app'), image: 'traefik/whoami:latest' }],
      expose: [{ kind: ExposeKind.HTTPS, podName: 'app', podPort: 80 }],
      timeoutMilliseconds: 120000,
    }
  }

  function handleEnableChange(enabled: string) {
    onConfigChange(enabled === 'yes' ? getDefaultConfig() : null)
  }

  function updateConfig(updater: (cfg: InstancerConfig) => InstancerConfig) {
    if (!config) return
    onConfigChange(updater(config))
  }

  function modifyContainer(modifier: (container: Container) => Container) {
    if (!selectedContainer) return
    updateConfig(cfg => ({
      ...cfg,
      pods: cfg.pods.map(c => (c.name === selectedContainer ? modifier(c) : c)),
    }))
  }

  function addContainer() {
    const existingNames = new Set(config?.pods.map(c => c.name) ?? [])
    let counter = 1
    let newName = `container-${counter}`
    while (existingNames.has(newName)) {
      counter++
      newName = `container-${counter}`
    }
    updateConfig(cfg => ({
      ...cfg,
      pods: [...cfg.pods, getDefaultContainer(newName)],
    }))
    selectedContainer = newName
  }

  function removeContainer(containerName: string) {
    if (!config || config.pods.length <= 1) return
    const idx = config.pods.findIndex(c => c.name === containerName)
    const nextContainer = config.pods[idx === 0 ? 1 : idx - 1]
    updateConfig(cfg => ({
      ...cfg,
      pods: cfg.pods.filter(c => c.name !== containerName),
      expose: cfg.expose.filter(e => e.podName !== containerName),
    }))
    if (selectedContainer === containerName) {
      selectedContainer = nextContainer?.name ?? ''
    }
  }

  function modifyExpose(index: number, modifier: (e: Expose) => Expose) {
    updateConfig(cfg => ({
      ...cfg,
      expose: cfg.expose.map((e, i) => (i === index ? modifier(e) : e)),
    }))
  }

  function addExpose() {
    if (!config?.pods[0]) return
    updateConfig(cfg => ({
      ...cfg,
      expose: [
        ...cfg.expose,
        { kind: ExposeKind.HTTPS, podName: cfg.pods[0]!.name, podPort: 80 },
      ],
    }))
  }

  function removeExpose(index: number) {
    updateConfig(cfg => ({
      ...cfg,
      expose: cfg.expose.filter((_, i) => i !== index),
    }))
  }

  const formatMemoryMB = (bytes: number) => Math.round(bytes / (1024 * 1024))
  const parseMemoryMB = (mb: number) => mb * 1024 * 1024
  const formatCpuCores = (nano: number) => nano / NANO_PER_CORE
  const parseCpuCores = (cores: number) => Math.round(cores * NANO_PER_CORE)
  const formatTimeoutSeconds = (ms: number) => Math.round(ms / 1000)
  const parseTimeoutSeconds = (s: number) => s * 1000
  function envToString(env: Record<string, string>): string {
    return Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  }

  function stringToEnv(str: string): Record<string, string> {
    const env: Record<string, string> = {}
    for (const line of str.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const idx = trimmed.indexOf('=')
      if (idx > 0) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
    }
    return env
  }
</script>

<div class="flex flex-col gap-4">
  <Section.Root>
    <Section.Header>Configuration</Section.Header>
    <Section.Content class="flex flex-col gap-4">
      <Field.Field>
        <Field.Label for="enableInstancer">Enable instancer</Field.Label>
        <Select.Root
          type="single"
          value={isEnabled ? 'yes' : 'no'}
          onValueChange={handleEnableChange}
          disabled={isDisabled}
        >
          <Select.Trigger class="w-full">
            {isEnabled ? 'Enabled' : 'Disabled'}
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
            <Field.Label for="challengeIntegrationId"
              >Integration ID</Field.Label
            >
            <Input
              id="challengeIntegrationId"
              type="text"
              placeholder="challenge-id"
              class="font-mono"
              value={config.challengeIntegrationId}
              oninput={e =>
                updateConfig(cfg => ({
                  ...cfg,
                  challengeIntegrationId: e.currentTarget.value,
                }))}
              disabled={isDisabled}
            />
          </Field.Field>

          <Field.Field>
            <Field.Label for="timeout"
              >Timeout <Field.Hint>(seconds)</Field.Hint></Field.Label
            >
            <Input
              id="timeout"
              type="number"
              min={0}
              value={formatTimeoutSeconds(config.timeoutMilliseconds)}
              oninput={e =>
                updateConfig(cfg => ({
                  ...cfg,
                  timeoutMilliseconds: parseTimeoutSeconds(
                    Number(e.currentTarget.value)
                  ),
                }))}
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
                  {#each config.pods as container (container.name)}
                    <div
                      class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm {selectedContainer ===
                      container.name
                        ? 'bg-background-l4 text-foreground-l0'
                        : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'}"
                      role="button"
                      tabindex="0"
                      onclick={() => (selectedContainer = container.name)}
                      onkeydown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectedContainer = container.name
                        }
                      }}
                    >
                      <span class="flex-1 truncate font-mono"
                        >{container.name}</span
                      >
                      {#if config.pods.length > 1}
                        <button
                          type="button"
                          class="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-background-destructive hover:text-foreground-destructive {selectedContainer ===
                          container.name
                            ? 'opacity-100'
                            : ''}"
                          onclick={e => {
                            e.stopPropagation()
                            removeContainer(container.name)
                          }}
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
                <Button
                  type="button"
                  size="sm"
                  class="w-full"
                  onclick={addContainer}
                  disabled={isDisabled}
                >
                  <IconPlus class="size-4" />
                  Add container
                </Button>
              </div>
            </div>
          </div>

          <div class="flex-1 p-4">
            {#if currentContainer}
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                  <Field.Field>
                    <Field.Label for="container-name">Name</Field.Label>
                    <Input
                      id="container-name"
                      type="text"
                      class="font-mono"
                      value={currentContainer.name}
                      oninput={e => {
                        const newName = e.currentTarget.value
                        modifyContainer(c => ({ ...c, name: newName }))
                        selectedContainer = newName
                      }}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-image">Image</Field.Label>
                    <Input
                      id="container-image"
                      type="text"
                      placeholder="image:tag"
                      class="font-mono"
                      value={currentContainer.image}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          image: e.currentTarget.value,
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                </div>

                <span
                  class="w-full border-b-2 pb-2 text-sm font-medium text-foreground-l3"
                >
                  Resources
                </span>
                <div class="grid grid-cols-4 gap-4">
                  <Field.Field>
                    <Field.Label for="container-memory">
                      Memory <Field.Hint>(MB)</Field.Hint>
                    </Field.Label>
                    <Input
                      id="container-memory"
                      type="number"
                      min={1}
                      value={formatMemoryMB(
                        currentContainer.limits.memoryBytes
                      )}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          limits: {
                            ...c.limits,
                            memoryBytes: parseMemoryMB(
                              Number(e.currentTarget.value)
                            ),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-cpu">
                      CPU <Field.Hint>(cores)</Field.Hint>
                    </Field.Label>
                    <Input
                      id="container-cpu"
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={formatCpuCores(currentContainer.limits.cpusNano)}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          limits: {
                            ...c.limits,
                            cpusNano: parseCpuCores(
                              Number(e.currentTarget.value)
                            ),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-pids">
                      PIDs <Field.Hint>(limit)</Field.Hint>
                    </Field.Label>
                    <Input
                      id="container-pids"
                      type="number"
                      min={1}
                      value={currentContainer.limits.pidsLimit}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          limits: {
                            ...c.limits,
                            pidsLimit: Number(e.currentTarget.value),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-egress">Egress</Field.Label>
                    <Select.Root
                      type="single"
                      value={currentContainer.egress ? 'yes' : 'no'}
                      onValueChange={v =>
                        modifyContainer(c => ({ ...c, egress: v === 'yes' }))}
                      disabled={isDisabled}
                    >
                      <Select.Trigger id="container-egress" class="w-full">
                        {currentContainer.egress ? 'Allowed' : 'Blocked'}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="yes" label="Allowed"
                          >Allowed</Select.Item
                        >
                        <Select.Item value="no" label="Blocked"
                          >Blocked</Select.Item
                        >
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>
                </div>

                <span
                  class="w-full border-b-2 pb-2 text-sm font-medium text-foreground-l3"
                >
                  Security
                </span>
                <div class="grid grid-cols-2 gap-4">
                  <Field.Field>
                    <Field.Label for="container-readonly"
                      >Read-only FS</Field.Label
                    >
                    <Select.Root
                      type="single"
                      value={currentContainer.security.readOnlyFs
                        ? 'yes'
                        : 'no'}
                      onValueChange={v =>
                        modifyContainer(c => ({
                          ...c,
                          security: { ...c.security, readOnlyFs: v === 'yes' },
                        }))}
                      disabled={isDisabled}
                    >
                      <Select.Trigger id="container-readonly" class="w-full">
                        {currentContainer.security.readOnlyFs ? 'Yes' : 'No'}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="yes" label="Yes">Yes</Select.Item>
                        <Select.Item value="no" label="No">No</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-secopt"
                      >Security opts</Field.Label
                    >
                    <Input
                      id="container-secopt"
                      type="text"
                      placeholder="no-new-privileges, ..."
                      class="font-mono"
                      value={arrayToString(
                        currentContainer.security.dockerSecurityOpt
                      )}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          security: {
                            ...c.security,
                            dockerSecurityOpt: stringToArray(
                              e.currentTarget.value
                            ),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-capadd">Cap add</Field.Label>
                    <Input
                      id="container-capadd"
                      type="text"
                      placeholder="CAP_NET_ADMIN, ..."
                      class="font-mono"
                      value={arrayToString(currentContainer.security.capAdd)}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          security: {
                            ...c.security,
                            capAdd: stringToArray(e.currentTarget.value),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="container-capdrop">Cap drop</Field.Label>
                    <Input
                      id="container-capdrop"
                      type="text"
                      placeholder="ALL, ..."
                      class="font-mono"
                      value={arrayToString(currentContainer.security.capDrop)}
                      oninput={e =>
                        modifyContainer(c => ({
                          ...c,
                          security: {
                            ...c.security,
                            capDrop: stringToArray(e.currentTarget.value),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                </div>

                <Field.Field>
                  <Field.Label for="container-env">
                    Environment <Field.Hint>(one per line)</Field.Hint>
                  </Field.Label>
                  <Textarea
                    id="container-env"
                    placeholder="KEY=value"
                    class="font-mono text-sm"
                    rows={3}
                    value={envToString(currentContainer.env)}
                    oninput={e =>
                      modifyContainer(c => ({
                        ...c,
                        env: stringToEnv(e.currentTarget.value),
                      }))}
                    disabled={isDisabled}
                  />
                </Field.Field>
              </div>
            {:else}
              <div
                class="flex h-full items-center justify-center text-sm text-foreground-l4"
              >
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
        <Button
          type="button"
          size="sm"
          onclick={addExpose}
          disabled={isDisabled || config.pods.length === 0}
        >
          <IconPlus class="size-4" />
          Add
        </Button>
      </Section.Header>
      {#if config.expose.length > 0}
        <div class="divide-y divide-border">
          {#each config.expose as exp, i (i)}
            <div class="flex items-center gap-3 px-4 py-2">
              <Select.Root
                type="single"
                value={exp.kind}
                onValueChange={v =>
                  modifyExpose(i, e => ({ ...e, kind: v as ExposeKind }))}
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
                onValueChange={v =>
                  modifyExpose(i, e => ({ ...e, podName: v }))}
                disabled={isDisabled}
              >
                <Select.Trigger class="w-32 font-mono"
                  >{exp.podName}</Select.Trigger
                >
                <Select.Content>
                  {#each config.pods as container}
                    <Select.Item value={container.name} label={container.name}
                      >{container.name}</Select.Item
                    >
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
                oninput={e =>
                  modifyExpose(i, ex => ({
                    ...ex,
                    podPort: Number(e.currentTarget.value),
                  }))}
                disabled={isDisabled}
              />

              <div class="flex-1"></div>

              <Button
                type="button"
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
          <p class="text-foreground-l4 text-sm">No exposed ports configured.</p>
        </Section.Content>
      {/if}
    </Section.Root>
  {/if}
</div>
