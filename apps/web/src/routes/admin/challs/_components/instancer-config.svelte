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

  const isEnabled = $derived(config !== null)
  let selectedPod: string = $state('')

  const NANO_PER_CORE = 1_000_000_000

  type Pod = InstancerConfig['pods'][number]
  type Expose = InstancerConfig['expose'][number]

  $effect(() => {
    if (!config) return
    const names = config.pods.map(p => p.name)
    const hasDuplicates = new Set(names).size !== names.length
    if (hasDuplicates) {
      const seen = new Set<string>()
      const renamedPods = config.pods.map(pod => {
        if (!seen.has(pod.name)) {
          seen.add(pod.name)
          return pod
        }
        let counter = 1
        let newName = `${pod.name}-${counter}`
        while (seen.has(newName)) {
          counter++
          newName = `${pod.name}-${counter}`
        }
        seen.add(newName)
        return { ...pod, name: newName }
      })
      onConfigChange({ ...config, pods: renamedPods })
      return
    }
    if (!selectedPod || !config.pods.find(p => p.name === selectedPod)) {
      selectedPod = config.pods[0]?.name ?? ''
    }
  })

  const currentPod = $derived(config?.pods.find(p => p.name === selectedPod))

  function getDefaultPod(name: string): Pod {
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
      pods: [{ ...getDefaultPod('app'), image: 'traefik/whoami:latest' }],
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

  function modifyPod(modifier: (pod: Pod) => Pod) {
    if (!selectedPod) return
    updateConfig(cfg => ({
      ...cfg,
      pods: cfg.pods.map(p => (p.name === selectedPod ? modifier(p) : p)),
    }))
  }

  function addPod() {
    const existingNames = new Set(config?.pods.map(p => p.name) ?? [])
    let counter = 1
    let newName = `pod-${counter}`
    while (existingNames.has(newName)) {
      counter++
      newName = `pod-${counter}`
    }
    updateConfig(cfg => ({
      ...cfg,
      pods: [...cfg.pods, getDefaultPod(newName)],
    }))
    selectedPod = newName
  }

  function removePod(podName: string) {
    if (!config || config.pods.length <= 1) return
    const idx = config.pods.findIndex(p => p.name === podName)
    const nextPod = config.pods[idx === 0 ? 1 : idx - 1]
    updateConfig(cfg => ({
      ...cfg,
      pods: cfg.pods.filter(p => p.name !== podName),
      expose: cfg.expose.filter(e => e.podName !== podName),
    }))
    if (selectedPod === podName) {
      selectedPod = nextPod?.name ?? ''
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
  const arrayToString = (arr: string[]) => arr.join(', ')
  const stringToArray = (str: string) =>
    str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

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
      <Section.Header>Pods</Section.Header>
      <Section.Content class="p-0">
        <div class="flex">
          <div class="relative w-44 shrink-0 border-r-2">
            <div class="absolute inset-0 flex flex-col">
              <ScrollArea class="min-h-0 flex-1" fadeColor="background-l2">
                <div class="flex flex-col gap-0.5 p-2">
                  {#each config.pods as pod (pod.name)}
                    <div
                      class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm {selectedPod ===
                      pod.name
                        ? 'bg-background-l4 text-foreground-l0'
                        : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'}"
                      role="button"
                      tabindex="0"
                      onclick={() => (selectedPod = pod.name)}
                      onkeydown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectedPod = pod.name
                        }
                      }}
                    >
                      <span class="flex-1 truncate font-mono">{pod.name}</span>
                      {#if config.pods.length > 1}
                        <button
                          type="button"
                          class="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-background-destructive hover:text-foreground-destructive {selectedPod ===
                          pod.name
                            ? 'opacity-100'
                            : ''}"
                          onclick={e => {
                            e.stopPropagation()
                            removePod(pod.name)
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
                  onclick={addPod}
                  disabled={isDisabled}
                >
                  <IconPlus class="size-4" />
                  Add pod
                </Button>
              </div>
            </div>
          </div>

          <div class="flex-1 p-4">
            {#if currentPod}
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                  <Field.Field>
                    <Field.Label for="pod-name">Name</Field.Label>
                    <Input
                      id="pod-name"
                      type="text"
                      class="font-mono"
                      value={currentPod.name}
                      oninput={e => {
                        const newName = e.currentTarget.value
                        modifyPod(p => ({ ...p, name: newName }))
                        selectedPod = newName
                      }}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-image">Image</Field.Label>
                    <Input
                      id="pod-image"
                      type="text"
                      placeholder="image:tag"
                      class="font-mono"
                      value={currentPod.image}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
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
                    <Field.Label for="pod-memory">
                      Memory <Field.Hint>(MB)</Field.Hint>
                    </Field.Label>
                    <Input
                      id="pod-memory"
                      type="number"
                      min={1}
                      value={formatMemoryMB(currentPod.limits.memoryBytes)}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
                          limits: {
                            ...p.limits,
                            memoryBytes: parseMemoryMB(
                              Number(e.currentTarget.value)
                            ),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-cpu">
                      CPU <Field.Hint>(cores)</Field.Hint>
                    </Field.Label>
                    <Input
                      id="pod-cpu"
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={formatCpuCores(currentPod.limits.cpusNano)}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
                          limits: {
                            ...p.limits,
                            cpusNano: parseCpuCores(
                              Number(e.currentTarget.value)
                            ),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-pids">
                      PIDs <Field.Hint>(limit)</Field.Hint>
                    </Field.Label>
                    <Input
                      id="pod-pids"
                      type="number"
                      min={1}
                      value={currentPod.limits.pidsLimit}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
                          limits: {
                            ...p.limits,
                            pidsLimit: Number(e.currentTarget.value),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-egress">Egress</Field.Label>
                    <Select.Root
                      type="single"
                      value={currentPod.egress ? 'yes' : 'no'}
                      onValueChange={v =>
                        modifyPod(p => ({ ...p, egress: v === 'yes' }))}
                      disabled={isDisabled}
                    >
                      <Select.Trigger id="pod-egress" class="w-full">
                        {currentPod.egress ? 'Allowed' : 'Blocked'}
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
                <div class="grid grid-cols-4 gap-4">
                  <Field.Field>
                    <Field.Label for="pod-readonly">Read-only FS</Field.Label>
                    <Select.Root
                      type="single"
                      value={currentPod.security.readOnlyFs ? 'yes' : 'no'}
                      onValueChange={v =>
                        modifyPod(p => ({
                          ...p,
                          security: { ...p.security, readOnlyFs: v === 'yes' },
                        }))}
                      disabled={isDisabled}
                    >
                      <Select.Trigger id="pod-readonly" class="w-full">
                        {currentPod.security.readOnlyFs ? 'Yes' : 'No'}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="yes" label="Yes">Yes</Select.Item>
                        <Select.Item value="no" label="No">No</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-capadd">Cap add</Field.Label>
                    <Input
                      id="pod-capadd"
                      type="text"
                      placeholder="CAP_NET_ADMIN, ..."
                      class="font-mono text-sm"
                      value={arrayToString(currentPod.security.capAdd)}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
                          security: {
                            ...p.security,
                            capAdd: stringToArray(e.currentTarget.value),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-capdrop">Cap drop</Field.Label>
                    <Input
                      id="pod-capdrop"
                      type="text"
                      placeholder="ALL, ..."
                      class="font-mono text-sm"
                      value={arrayToString(currentPod.security.capDrop)}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
                          security: {
                            ...p.security,
                            capDrop: stringToArray(e.currentTarget.value),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for="pod-secopt">Security opts</Field.Label>
                    <Input
                      id="pod-secopt"
                      type="text"
                      placeholder="no-new-privileges, ..."
                      class="font-mono text-sm"
                      value={arrayToString(
                        currentPod.security.dockerSecurityOpt
                      )}
                      oninput={e =>
                        modifyPod(p => ({
                          ...p,
                          security: {
                            ...p.security,
                            dockerSecurityOpt: stringToArray(
                              e.currentTarget.value
                            ),
                          },
                        }))}
                      disabled={isDisabled}
                    />
                  </Field.Field>
                </div>

                <Field.Field>
                  <Field.Label for="pod-env">
                    Environment <Field.Hint>(one per line)</Field.Hint>
                  </Field.Label>
                  <Textarea
                    id="pod-env"
                    placeholder="KEY=value"
                    class="font-mono text-sm"
                    rows={3}
                    value={envToString(currentPod.env)}
                    oninput={e =>
                      modifyPod(p => ({
                        ...p,
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
                Select a pod to view details
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
                  {#each config.pods as pod}
                    <Select.Item value={pod.name} label={pod.name}
                      >{pod.name}</Select.Item
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
