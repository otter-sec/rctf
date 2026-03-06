<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { showApiError } from '$lib/api'
  import {
    Button,
    Card,
    Field,
    Input,
    Markdown,
    ScrollArea,
    Section,
    Spinner,
    Tabs,
    Textarea,
  } from '$lib/components'
  import { IconPlus, IconX } from '$lib/icons'
  import {
    queryKeys,
    useAdminSettings,
    useClientConfig,
    useUpdateSettingsMutation,
  } from '$lib/query'
  import { cn } from '$lib/utils'

  const queryClient = useQueryClient()
  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const settingsQuery = useAdminSettings()
  const settings = $derived(settingsQuery.data)
  const isPending = $derived(settingsQuery.isPending)
  const mutation = useUpdateSettingsMutation()

  let ctfName = $state('')
  let faviconUrl = $state('')
  let homeContent = $state('')
  let metaDescription = $state('')
  let metaImageUrl = $state('')
  let logoLightUrl = $state('')
  let logoDarkUrl = $state('')
  let sponsors = $state<{ name: string; icon: string; description: string; url: string }[]>([])

  let overrides = $state<Record<string, boolean>>({})
  let initialized = $state(false)

  $effect(() => {
    if (settings && !initialized) {
      const o = settings.overrides
      const d = settings.defaults

      ctfName = o.ctfName ?? d.ctfName ?? ''
      faviconUrl = o.faviconUrl ?? d.faviconUrl ?? ''
      homeContent = o.homeContent ?? d.homeContent ?? ''
      metaDescription = o.meta?.description ?? d.meta?.description ?? ''
      metaImageUrl = o.meta?.imageUrl ?? d.meta?.imageUrl ?? ''
      logoLightUrl = o.logoLightUrl ?? d.logoLightUrl ?? ''
      logoDarkUrl = o.logoDarkUrl ?? d.logoDarkUrl ?? ''

      const sponsorArr = o.sponsors ?? d.sponsors ?? []
      sponsors = sponsorArr.map(s => ({
        name: s.name,
        icon: s.icon,
        description: s.description,
        url: s.url ?? '',
      }))

      overrides = {
        ctfName: o.ctfName !== undefined,
        faviconUrl: o.faviconUrl !== undefined,
        homeContent: o.homeContent !== undefined,
        meta: o.meta !== undefined,
        logo: o.logoLightUrl !== undefined || o.logoDarkUrl !== undefined,
        sponsors: o.sponsors !== undefined,
      }

      initialized = true
    }
  })

  function resetField(field: string) {
    if (!settings) return
    const d = settings.defaults
    switch (field) {
      case 'ctfName':
        ctfName = d.ctfName ?? ''
        break
      case 'faviconUrl':
        faviconUrl = d.faviconUrl ?? ''
        break
      case 'homeContent':
        homeContent = d.homeContent ?? ''
        break
      case 'meta':
        metaDescription = d.meta?.description ?? ''
        metaImageUrl = d.meta?.imageUrl ?? ''
        break
      case 'logo':
        logoLightUrl = d.logoLightUrl ?? ''
        logoDarkUrl = d.logoDarkUrl ?? ''
        break
      case 'sponsors': {
        const sponsorArr = d.sponsors ?? []
        sponsors = sponsorArr.map(s => ({
          name: s.name,
          icon: s.icon,
          description: s.description,
          url: s.url ?? '',
        }))
        selectedSponsor = 0
        break
      }
    }
    overrides[field] = false
  }

  function markOverridden(field: string) {
    overrides[field] = true
  }

  let selectedSponsor = $state(0)

  $effect(() => {
    if (selectedSponsor >= sponsors.length) selectedSponsor = Math.max(0, sponsors.length - 1)
  })

  function addSponsor() {
    sponsors = [...sponsors, { name: '', icon: '', description: '', url: '' }]
    selectedSponsor = sponsors.length - 1
    markOverridden('sponsors')
  }

  function removeSponsor(index: number) {
    sponsors = sponsors.filter((_, i) => i !== index)
    markOverridden('sponsors')
  }

  const isSaving = $derived(mutation.isPending)

  async function handleSave() {
    const patch: Record<string, unknown> = {}

    if (overrides.ctfName) {
      patch.ctfName = ctfName
    } else if (settings?.overrides.ctfName !== undefined) {
      patch.ctfName = null
    }

    if (overrides.faviconUrl) {
      patch.faviconUrl = faviconUrl
    } else if (settings?.overrides.faviconUrl !== undefined) {
      patch.faviconUrl = null
    }

    if (overrides.homeContent) {
      patch.homeContent = homeContent
    } else if (settings?.overrides.homeContent !== undefined) {
      patch.homeContent = null
    }

    if (overrides.meta) {
      patch.meta = { description: metaDescription, imageUrl: metaImageUrl }
    } else if (settings?.overrides.meta !== undefined) {
      patch.meta = null
    }

    if (overrides.logo) {
      patch.logoLightUrl = logoLightUrl
      patch.logoDarkUrl = logoDarkUrl
    } else {
      if (settings?.overrides.logoLightUrl !== undefined) patch.logoLightUrl = null
      if (settings?.overrides.logoDarkUrl !== undefined) patch.logoDarkUrl = null
    }

    if (overrides.sponsors) {
      patch.sponsors = sponsors.map(s => ({
        name: s.name,
        icon: s.icon,
        description: s.description,
        ...(s.url ? { url: s.url } : {}),
      }))
    } else if (settings?.overrides.sponsors !== undefined) {
      patch.sponsors = null
    }

    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save.')
      return
    }

    mutation.mutate({ data: patch } as any, {
      onSuccess: (response: { kind: string; message: string; data?: unknown }) => {
        if (response.kind === 'goodAdminSettingsUpdate') {
          toast.success('Settings saved.')
          queryClient.invalidateQueries({ queryKey: queryKeys.clientConfig })
          queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings })
        } else {
          showApiError(response as any)
        }
      },
      onError: () => {
        toast.error('Failed to save settings.')
      },
    })
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Settings | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#snippet resetButton(field: string)}
  {#if overrides[field]}
    <button
      class="text-foreground-l3 hover:text-foreground-l1 text-xs"
      onclick={() => resetField(field)}
    >
      Reset to default
    </button>
  {/if}
{/snippet}

{#if settings && initialized}
  <ScrollArea
    class="h-[calc(100vh-72px)]"
    fadeSize={64}
    fadeColor="background-l0"
    fadeOffsets={{ bottom: 60 }}
  >
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 pb-24">
      <Section.Root class="bg-background-l1">
        <Section.Header class="flex items-center justify-between">
          <span>General</span>
          {@render resetButton('ctfName')}
        </Section.Header>
        <Section.Content class="flex flex-col gap-3">
          <Field.Field>
            <Field.Label>CTF name</Field.Label>
            <Input
              value={ctfName}
              oninput={e => {
                ctfName = e.currentTarget.value
                markOverridden('ctfName')
              }}
              placeholder={settings.defaults.ctfName}
            />
            {#if overrides.ctfName}
              <Field.Hint>Config default: {settings.defaults.ctfName}</Field.Hint>
            {/if}
          </Field.Field>

          <Field.Field>
            <Field.Label class="flex items-center justify-between">
              Favicon URL
              {@render resetButton('faviconUrl')}
            </Field.Label>
            <Input
              value={faviconUrl}
              oninput={e => {
                faviconUrl = e.currentTarget.value
                markOverridden('faviconUrl')
              }}
              placeholder={settings.defaults.faviconUrl}
            />
            {#if overrides.faviconUrl}
              <Field.Hint>Config default: {settings.defaults.faviconUrl}</Field.Hint>
            {/if}
          </Field.Field>
        </Section.Content>
      </Section.Root>

      <Section.Root class="bg-background-l1">
        <Section.Header class="flex items-center justify-between">
          <span>Logo</span>
          {@render resetButton('logo')}
        </Section.Header>
        <Section.Content class="flex flex-col gap-3">
          <Field.Field>
            <Field.Label>Light mode URL</Field.Label>
            <Input
              value={logoLightUrl}
              oninput={e => {
                logoLightUrl = e.currentTarget.value
                markOverridden('logo')
              }}
              placeholder={settings.defaults.logoLightUrl || 'Built-in wordmark'}
            />
          </Field.Field>
          <Field.Field>
            <Field.Label>Dark mode URL</Field.Label>
            <Input
              value={logoDarkUrl}
              oninput={e => {
                logoDarkUrl = e.currentTarget.value
                markOverridden('logo')
              }}
              placeholder={settings.defaults.logoDarkUrl || 'Built-in wordmark'}
            />
          </Field.Field>
        </Section.Content>
      </Section.Root>

      <Section.Root class="bg-background-l1">
        <Section.Header class="flex items-center justify-between">
          <span>Home content</span>
          {@render resetButton('homeContent')}
        </Section.Header>
        <Section.Content class="p-0">
          <Tabs.Root value="edit">
            <div class="flex items-center gap-2 px-4 pt-3">
              <Tabs.List>
                <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
                <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
              </Tabs.List>
            </div>
            <Tabs.Content value="edit" class="p-4">
              <Textarea
                class="font-mono text-sm"
                value={homeContent}
                oninput={e => {
                  homeContent = e.currentTarget.value
                  markOverridden('homeContent')
                }}
                rows={12}
                placeholder="Markdown content for the home page..."
              />
            </Tabs.Content>
            <Tabs.Content value="preview" class="p-4">
              <div class="min-h-32">
                <Markdown content={homeContent} />
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Section.Content>
      </Section.Root>

      <Section.Root class="bg-background-l1">
        <Section.Header class="flex items-center justify-between">
          <span>Open Graph</span>
          {@render resetButton('meta')}
        </Section.Header>
        <Section.Content class="flex flex-col gap-3">
          <Field.Field>
            <Field.Label>OG Description</Field.Label>
            <Input
              value={metaDescription}
              oninput={e => {
                metaDescription = e.currentTarget.value
                markOverridden('meta')
              }}
              placeholder={settings.defaults.meta?.description}
            />
          </Field.Field>
          <Field.Field>
            <Field.Label>OG Image URL</Field.Label>
            <Input
              value={metaImageUrl}
              oninput={e => {
                metaImageUrl = e.currentTarget.value
                markOverridden('meta')
              }}
              placeholder={settings.defaults.meta?.imageUrl}
            />
          </Field.Field>
        </Section.Content>
      </Section.Root>

      <Section.Root class="bg-background-l1">
        <Section.Header class="flex items-center justify-between">
          <span>Sponsors</span>
          {@render resetButton('sponsors')}
        </Section.Header>
        <Section.Content class="@container/panel p-0">
          <div class="flex min-h-48 flex-col @md/panel:flex-row">
            <div
              class="flex w-full shrink-0 flex-col border-b-2 @md/panel:w-44 @md/panel:border-r-2 @md/panel:border-b-0"
            >
              <div
                class="flex flex-row flex-wrap gap-1 overflow-hidden p-2 @md/panel:flex-col @md/panel:gap-0.5"
              >
                {#if sponsors.length === 0}
                  <p class="text-foreground-l4 px-2 py-1.5 text-sm">No sponsors</p>
                {:else}
                  {#each sponsors as sponsor, i (i)}
                    {@const active = selectedSponsor === i}
                    <div
                      class={cn(
                        'group flex max-w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm @md/panel:w-full @md/panel:gap-2',
                        active
                          ? 'bg-background-l4 text-foreground-l0'
                          : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'
                      )}
                      role="button"
                      tabindex="0"
                      onclick={() => (selectedSponsor = i)}
                      onkeydown={e =>
                        (e.key === 'Enter' || e.key === ' ') &&
                        (e.preventDefault(), (selectedSponsor = i))}
                    >
                      <span class="truncate @md/panel:min-w-0 @md/panel:flex-1">
                        {sponsor.name || `Sponsor ${i + 1}`}
                      </span>
                      <button
                        type="button"
                        class={cn(
                          'hover:bg-background-destructive hover:text-foreground-destructive shrink-0 rounded p-0.5',
                          active
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 @max-md/panel:opacity-100'
                        )}
                        onclick={e => (e.stopPropagation(), removeSponsor(i))}
                      >
                        <IconX class="size-3" />
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>
              <div class="shrink-0 border-t-2 p-2">
                <Button size="sm" class="w-full" onclick={addSponsor}>
                  <IconPlus class="size-4" />
                  Add
                </Button>
              </div>
            </div>
            <div class="min-w-0 flex-1 p-4">
              {#if sponsors[selectedSponsor] !== undefined}
                {@const sponsor = sponsors[selectedSponsor]!}
                <div class="flex flex-col gap-3">
                  <Field.Field>
                    <Field.Label>Name</Field.Label>
                    <Input
                      value={sponsor.name}
                      oninput={e => {
                        sponsor.name = e.currentTarget.value
                        sponsors = sponsors
                        markOverridden('sponsors')
                      }}
                      placeholder="Sponsor name"
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Icon URL</Field.Label>
                    <Input
                      value={sponsor.icon}
                      oninput={e => {
                        sponsor.icon = e.currentTarget.value
                        sponsors = sponsors
                        markOverridden('sponsors')
                      }}
                      placeholder="https://..."
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>Description</Field.Label>
                    <Textarea
                      value={sponsor.description}
                      oninput={e => {
                        sponsor.description = e.currentTarget.value
                        sponsors = sponsors
                        markOverridden('sponsors')
                      }}
                      rows={3}
                      placeholder="Sponsor description"
                    />
                  </Field.Field>
                  <Field.Field>
                    <Field.Label>URL</Field.Label>
                    <Input
                      value={sponsor.url}
                      oninput={e => {
                        sponsor.url = e.currentTarget.value
                        sponsors = sponsors
                        markOverridden('sponsors')
                      }}
                      placeholder="https://..."
                    />
                  </Field.Field>
                </div>
              {:else}
                <div class="text-foreground-l4 flex h-full items-center justify-center text-sm">
                  Add a sponsor to get started
                </div>
              {/if}
            </div>
          </div>
        </Section.Content>
      </Section.Root>
    </div>
  </ScrollArea>

  <div class="pointer-events-none fixed right-0 bottom-0 left-0 flex justify-center">
    <div class="bg-background-l0 pointer-events-auto w-full max-w-3xl px-4 pt-2 pb-4">
      <Button onclick={handleSave} disabled={isSaving} class="w-full">
        {#if isSaving}
          <Spinner class="size-4" />
        {/if}
        Save changes
      </Button>
    </div>
  </div>
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else}
  <div class="flex flex-1 items-center justify-center p-4">
    <div class="w-full max-w-md">
      <Card.Root>
        <Card.Header>
          <Card.Title>Settings</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-foreground-l3">
            {settingsQuery.error?.message ?? 'Failed to load settings.'}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
{/if}
