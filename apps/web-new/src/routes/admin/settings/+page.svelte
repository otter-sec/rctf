<!--
  Admin settings (R31-R34). A single scrollable form over the overrides-vs-
  defaults model with a sticky bottom save bar. Each group tracks whether it
  overrides the config default; editing marks it, "Reset to default" reverts and
  clears the flag, and Save sends a patch that omits untouched groups, sends
  edited values, and sends `null` to clear a group reset away from a previous
  override (see settings-model.ts). External-auth clients live in their own
  component and are managed directly, outside this patch.
-->
<script lang="ts">
  import {
    GoodAdminSettingsUpdate,
    GoodFilesUploadV2,
    Permissions,
    UpdateAdminSettingsRouteV2,
    UploadFilesRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import wordmarkLight from '$lib/assets/wordmark-light.svg'
  import Markdown from '$lib/components/markdown.svelte'
  import IconCloud from '$lib/icons/icon-cloud-computing-filled.svelte'
  import IconTrashFilled from '$lib/icons/icon-trash-filled.svelte'
  import IconX from '$lib/icons/icon-x.svelte'
  import { useAdminSettings } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Tabs from '$lib/ui/tabs.svelte'
  import Textarea from '$lib/ui/textarea.svelte'
  import { hasPermissions } from '$lib/utils/permissions'
  import ExternalAuthClients from './external-auth-clients.svelte'
  import {
    buildPatch,
    formatDatetimeLocal,
    initialFormState,
    initialOverrides,
    parseDatetimeLocal,
    sponsorsReducer,
    validateTiming,
    type OriginalOverrides,
    type SettingsFormState,
    type SponsorAction,
  } from './settings-model'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const settingsQuery = useAdminSettings()

  // Non-reactive read: true only when this mount starts behind the spinner, so
  // a warm-cache remount doesn't replay the reveal fade.
  const revealAfterLoading = settingsQuery.isPending

  const user = $derived(userQuery.data)
  const ctfName = $derived(configQuery.data?.ctfName)
  const defaults = $derived(settingsQuery.data?.defaults)
  const canManageSettings = $derived(hasPermissions(user, Permissions.settingsWrite))
  const canManageApps = $derived(hasPermissions(user, Permissions.usersWrite))

  let form = $state<SettingsFormState | null>(null)
  let original: OriginalOverrides | null = null
  let sponsorSelected = $state(0)
  let initialized = $state(false)
  let saving = $state(false)
  let logoUploading = $state(false)
  let homeTab = $state('edit')
  let logoInputs = $state<Record<'light' | 'dark', HTMLInputElement | null>>({
    light: null,
    dark: null,
  })

  const logoTargets = [
    { key: 'light' as const, label: 'Light mode', fallback: wordmarkLight },
    { key: 'dark' as const, label: 'Dark mode', fallback: wordmarkDark },
  ]

  // Seed once from the loaded settings; a successful save commits a new baseline
  // in place (commitBaseline) rather than re-seeding, so refetches never clobber
  // in-progress edits.
  $effect(() => {
    const data = settingsQuery.data
    if (!data || initialized) return
    form = initialFormState(data.overrides, data.defaults)
    original = initialOverrides(data.overrides)
    sponsorSelected = 0
    initialized = true
  })

  const timingError = $derived(
    form ? validateTiming(form.timing.startTime, form.timing.endTime, form.timing.overridden) : null
  )
  const selectedSponsor = $derived(form?.sponsors.list[sponsorSelected])

  function markScalar(group: { overridden: boolean; dirty: boolean }) {
    group.overridden = true
    group.dirty = true
  }

  function defaultHint(overridden: boolean, value: string | undefined): string | undefined {
    return overridden ? `Default: ${value || '—'}` : undefined
  }

  function resetGeneral() {
    if (!form || !defaults) return
    form.ctfName = { value: defaults.ctfName ?? '', overridden: false, dirty: true }
    form.faviconUrl = { value: defaults.faviconUrl ?? '', overridden: false, dirty: true }
  }

  function resetTiming() {
    if (!form || !defaults) return
    form.timing = {
      startTime: defaults.startTime ?? null,
      endTime: defaults.endTime ?? null,
      overridden: false,
      dirty: true,
    }
  }

  function resetLogo() {
    if (!form || !defaults) return
    form.logo = {
      light: defaults.logoLightUrl ?? '',
      dark: defaults.logoDarkUrl ?? '',
      overridden: false,
      dirty: true,
    }
  }

  function resetHome() {
    if (!form || !defaults) return
    form.homeContent = { value: defaults.homeContent ?? '', overridden: false, dirty: true }
  }

  function resetMeta() {
    if (!form || !defaults) return
    form.meta = {
      description: defaults.meta?.description ?? '',
      imageUrl: defaults.meta?.imageUrl ?? '',
      overridden: false,
      dirty: true,
    }
  }

  function resetSponsors() {
    if (!form || !defaults) return
    form.sponsors = {
      list: (defaults.sponsors ?? []).map(s => ({
        name: s.name,
        icon: s.icon,
        description: s.description,
        url: s.url ?? '',
      })),
      overridden: false,
      dirty: true,
    }
    sponsorSelected = 0
  }

  function dispatchSponsors(action: SponsorAction) {
    if (!form) return
    const next = sponsorsReducer({ list: form.sponsors.list, selected: sponsorSelected }, action)
    form.sponsors.list = next.list
    sponsorSelected = next.selected
    if (action.type !== 'select') {
      form.sponsors.overridden = true
      form.sponsors.dirty = true
    }
  }

  async function uploadLogo(file: File, target: 'light' | 'dark') {
    if (!form) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    logoUploading = true
    try {
      const response = await apiRequest(UploadFilesRouteV2, { files: [file] })
      if (response.kind === GoodFilesUploadV2.kind) {
        const uploaded = response.data[0]
        if (!uploaded) {
          toast.error('Upload returned no file.')
          return
        }
        if (target === 'light') form.logo.light = uploaded.url
        else form.logo.dark = uploaded.url
        form.logo.overridden = true
        form.logo.dirty = true
      } else {
        showApiError(response)
      }
    } catch {
      toast.error('Failed to upload image.')
    } finally {
      logoUploading = false
    }
  }

  function onLogoFile(event: Event, target: 'light' | 'dark') {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (file) uploadLogo(file, target)
  }

  function removeLogo(target: 'light' | 'dark') {
    if (!form) return
    if (target === 'light') form.logo.light = ''
    else form.logo.dark = ''
    form.logo.overridden = true
    form.logo.dirty = true
  }

  function commitBaseline() {
    if (!form) return
    original = {
      ctfName: form.ctfName.overridden,
      faviconUrl: form.faviconUrl.overridden,
      timing: form.timing.overridden,
      logo: form.logo.overridden,
      homeContent: form.homeContent.overridden,
      meta: form.meta.overridden,
      sponsors: form.sponsors.overridden,
    }
    for (const group of [
      form.ctfName,
      form.faviconUrl,
      form.timing,
      form.logo,
      form.homeContent,
      form.meta,
      form.sponsors,
    ]) {
      group.dirty = false
    }
  }

  async function save() {
    if (!form || !original) return
    const error = validateTiming(form.timing.startTime, form.timing.endTime, form.timing.overridden)
    if (error) {
      toast.error(error)
      return
    }
    const patch = buildPatch(form, original)
    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save.')
      return
    }
    saving = true
    try {
      const response = await apiRequest(UpdateAdminSettingsRouteV2, { data: patch })
      if (response.kind === GoodAdminSettingsUpdate.kind) {
        toast.success('Settings saved.')
        commitBaseline()
        queryClient.invalidateQueries({ queryKey: queryKeys.clientConfig })
        queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings })
      } else {
        showApiError(response)
      }
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      saving = false
    }
  }
</script>

<svelte:head>
  {#if ctfName}
    <title>Settings | {ctfName}</title>
  {/if}
</svelte:head>

{#snippet groupHeader(title: string, overridden: boolean, onReset: () => void)}
  <group-header>
    <group-title>
      {title}
      {#if overridden}<overridden-badge>Overridden</overridden-badge>{/if}
    </group-title>
    {#if overridden}
      <button type="button" data-reset onclick={onReset}>Reset to default</button>
    {/if}
  </group-header>
{/snippet}

{#if !canManageSettings && user}
  <settings-status>
    <Card title="Access denied">
      <p>Your account does not have permission to manage settings.</p>
      <Button href="/admin/challenges">Back to admin</Button>
    </Card>
  </settings-status>
{:else if form && defaults}
  {@const settingsDefaults = defaults}
  {@const settingsForm = form}
  <settings-page data-reveal={revealAfterLoading || undefined}>
    <settings-form>
      <settings-group>
        {@render groupHeader(
          'General',
          settingsForm.ctfName.overridden || settingsForm.faviconUrl.overridden,
          resetGeneral
        )}
        <group-body>
          <Field
            label="CTF name"
            description={defaultHint(settingsForm.ctfName.overridden, settingsDefaults.ctfName)}
          >
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                aria-describedby={describedBy}
                value={settingsForm.ctfName.value}
                placeholder={settingsDefaults.ctfName}
                oninput={e => {
                  settingsForm.ctfName.value = e.currentTarget.value
                  markScalar(settingsForm.ctfName)
                }}
              />
            {/snippet}
          </Field>
          <Field
            label="Favicon URL"
            description={defaultHint(
              settingsForm.faviconUrl.overridden,
              settingsDefaults.faviconUrl
            )}
          >
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                aria-describedby={describedBy}
                value={settingsForm.faviconUrl.value}
                placeholder={settingsDefaults.faviconUrl}
                oninput={e => {
                  settingsForm.faviconUrl.value = e.currentTarget.value
                  markScalar(settingsForm.faviconUrl)
                }}
              />
            {/snippet}
          </Field>
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Timing', settingsForm.timing.overridden, resetTiming)}
        <group-body>
          <timing-grid>
            <Field label="CTF start (local time)">
              {#snippet children({ id })}
                <Input
                  {id}
                  type="datetime-local"
                  value={formatDatetimeLocal(settingsForm.timing.startTime)}
                  onchange={e => {
                    settingsForm.timing.startTime = parseDatetimeLocal(e.currentTarget.value)
                    markScalar(settingsForm.timing)
                  }}
                />
              {/snippet}
            </Field>
            <Field label="CTF end (local time)">
              {#snippet children({ id })}
                <Input
                  {id}
                  type="datetime-local"
                  value={formatDatetimeLocal(settingsForm.timing.endTime)}
                  onchange={e => {
                    settingsForm.timing.endTime = parseDatetimeLocal(e.currentTarget.value)
                    markScalar(settingsForm.timing)
                  }}
                />
              {/snippet}
            </Field>
          </timing-grid>
          {#if timingError}
            <field-error role="alert">{timingError}</field-error>
          {/if}
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Logo', settingsForm.logo.overridden, resetLogo)}
        <group-body>
          {#each logoTargets as target (target.key)}
            {@const url = settingsForm.logo[target.key]}
            <logo-row>
              <group-title>{target.label}</group-title>
              <logo-controls>
                <logo-preview data-mode={target.key}>
                  <img src={url || target.fallback} alt="{target.label} logo" />
                </logo-preview>
                <logo-actions>
                  <input
                    bind:this={logoInputs[target.key]}
                    type="file"
                    accept="image/*"
                    hidden
                    onchange={e => onLogoFile(e, target.key)}
                  />
                  <Button
                    size="sm"
                    onclick={() => logoInputs[target.key]?.click()}
                    disabled={logoUploading}
                  >
                    <IconCloud />
                    {url ? 'Change' : 'Upload'}
                  </Button>
                  {#if url}
                    <Button
                      size="sm"
                      variant="destructive"
                      onclick={() => removeLogo(target.key)}
                      disabled={logoUploading}
                    >
                      <IconTrashFilled />
                    </Button>
                  {/if}
                </logo-actions>
              </logo-controls>
            </logo-row>
          {/each}
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Home content', settingsForm.homeContent.overridden, resetHome)}
        <group-body data-flush>
          <Tabs
            bind:value={homeTab}
            tabs={[
              { value: 'edit', label: 'Edit' },
              { value: 'preview', label: 'Preview' },
            ]}
          >
            {#snippet content({ value })}
              {#if value === 'edit'}
                <tab-body>
                  <Textarea
                    data-mono
                    rows={12}
                    value={settingsForm.homeContent.value}
                    placeholder="Markdown content for the home page..."
                    oninput={e => {
                      settingsForm.homeContent.value = e.currentTarget.value
                      markScalar(settingsForm.homeContent)
                    }}
                  ></Textarea>
                </tab-body>
              {:else}
                <tab-body>
                  <Markdown content={settingsForm.homeContent.value} />
                </tab-body>
              {/if}
            {/snippet}
          </Tabs>
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Open Graph', settingsForm.meta.overridden, resetMeta)}
        <group-body>
          <Field label="Description">
            {#snippet children({ id })}
              <Input
                {id}
                value={settingsForm.meta.description}
                placeholder={settingsDefaults.meta?.description}
                oninput={e => {
                  settingsForm.meta.description = e.currentTarget.value
                  markScalar(settingsForm.meta)
                }}
              />
            {/snippet}
          </Field>
          <Field label="Image URL">
            {#snippet children({ id })}
              <Input
                {id}
                value={settingsForm.meta.imageUrl}
                placeholder={settingsDefaults.meta?.imageUrl}
                oninput={e => {
                  settingsForm.meta.imageUrl = e.currentTarget.value
                  markScalar(settingsForm.meta)
                }}
              />
            {/snippet}
          </Field>
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Sponsors', settingsForm.sponsors.overridden, resetSponsors)}
        <group-body>
          <sponsors-editor>
            <sponsor-list>
              {#if settingsForm.sponsors.list.length === 0}
                <sponsor-empty>No sponsors</sponsor-empty>
              {:else}
                {#each settingsForm.sponsors.list as sponsor, i (i)}
                  <sponsor-item data-active={sponsorSelected === i ? '' : undefined}>
                    <button
                      type="button"
                      data-select
                      onclick={() => dispatchSponsors({ type: 'select', index: i })}
                    >
                      {sponsor.name || `Sponsor ${i + 1}`}
                    </button>
                    <button
                      type="button"
                      data-remove
                      aria-label="Remove sponsor"
                      onclick={() => dispatchSponsors({ type: 'remove', index: i })}
                    >
                      <IconX />
                    </button>
                  </sponsor-item>
                {/each}
              {/if}
              <Button size="sm" variant="outline" onclick={() => dispatchSponsors({ type: 'add' })}>
                Add sponsor
              </Button>
            </sponsor-list>
            <sponsor-detail>
              {#if selectedSponsor}
                {@const sponsor = selectedSponsor}
                <Field label="Name">
                  {#snippet children({ id })}
                    <Input
                      {id}
                      value={sponsor.name}
                      placeholder="Sponsor name"
                      oninput={e =>
                        dispatchSponsors({
                          type: 'update',
                          index: sponsorSelected,
                          field: 'name',
                          value: e.currentTarget.value,
                        })}
                    />
                  {/snippet}
                </Field>
                <Field label="Icon URL">
                  {#snippet children({ id })}
                    <Input
                      {id}
                      value={sponsor.icon}
                      placeholder="https://..."
                      oninput={e =>
                        dispatchSponsors({
                          type: 'update',
                          index: sponsorSelected,
                          field: 'icon',
                          value: e.currentTarget.value,
                        })}
                    />
                  {/snippet}
                </Field>
                <Field label="Description">
                  {#snippet children({ id })}
                    <Textarea
                      {id}
                      rows={3}
                      value={sponsor.description}
                      placeholder="Sponsor description"
                      oninput={e =>
                        dispatchSponsors({
                          type: 'update',
                          index: sponsorSelected,
                          field: 'description',
                          value: e.currentTarget.value,
                        })}
                    ></Textarea>
                  {/snippet}
                </Field>
                <Field label="URL">
                  {#snippet children({ id })}
                    <Input
                      {id}
                      value={sponsor.url}
                      placeholder="https://..."
                      oninput={e =>
                        dispatchSponsors({
                          type: 'update',
                          index: sponsorSelected,
                          field: 'url',
                          value: e.currentTarget.value,
                        })}
                    />
                  {/snippet}
                </Field>
              {:else}
                <sponsor-placeholder>Add a sponsor to get started</sponsor-placeholder>
              {/if}
            </sponsor-detail>
          </sponsors-editor>
        </group-body>
      </settings-group>

      {#if canManageApps}
        <ExternalAuthClients />
      {/if}
    </settings-form>

    <save-bar>
      <Button onclick={save} disabled={saving}>
        {#if saving}<Spinner />{/if}
        Save changes
      </Button>
    </save-bar>
  </settings-page>
{:else if settingsQuery.isError}
  <settings-status>
    <Card title="Settings">
      <p>{settingsQuery.error?.message ?? 'Failed to load settings.'}</p>
    </Card>
  </settings-status>
{:else}
  <settings-status>
    <Spinner />
  </settings-status>
{/if}

<style>
  settings-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);
  }

  settings-status :global(ui-card) {
    inline-size: 100%;
    max-inline-size: 28rem;
  }

  settings-status p {
    margin: 0;
    color: var(--foreground-l3);
  }

  settings-page {
    display: block;
    inline-size: 100%;
    max-inline-size: 48rem;
    margin-inline: auto;
    padding: var(--space-m) var(--space-m) 0;
  }

  settings-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  settings-group {
    display: block;
    overflow: clip;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    min-block-size: 2.75rem;
    padding: var(--space-3xs) var(--space-s);
    background: var(--background-l3);
  }

  group-title {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    color: var(--foreground-l2);
  }

  overridden-badge {
    padding: 0 var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-accent);
    background: var(--background-accent);
    border-radius: var(--radius-full);
  }

  button[data-reset] {
    padding: 0;
    font-size: var(--step--1);
    color: var(--foreground-l4);
    background: none;
    border: none;
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
    }
  }

  group-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-s);

    &[data-flush] {
      padding: 0;
    }
  }

  field-error {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-destructive);
  }

  timing-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    @media (min-width: 32rem) {
      grid-template-columns: 1fr 1fr;
    }
  }

  logo-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  logo-controls {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  logo-preview {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 4.5rem;
    padding-inline: var(--space-m);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &[data-mode='light'] {
      background: oklch(98% 0 0);
    }

    &[data-mode='dark'] {
      background: oklch(15% 0 0);
    }

    img {
      max-block-size: 2.5rem;
      max-inline-size: 14rem;
    }
  }

  logo-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--space-2xs);
  }

  tab-body {
    display: block;
    padding: var(--space-s);
  }

  :global(textarea[data-mono]) {
    font-family: var(--font-mono);
    font-size: var(--step--1);
  }

  sponsors-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    @media (min-width: 40rem) {
      flex-direction: row;
    }
  }

  sponsor-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    flex-shrink: 0;

    @media (min-width: 40rem) {
      inline-size: 12rem;
    }
  }

  sponsor-item {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    border-radius: var(--radius-md);

    &[data-active] {
      background: var(--background-l4);
    }

    button[data-select] {
      overflow: hidden;
      flex: 1;
      padding: var(--space-3xs) var(--space-2xs);
      color: var(--foreground-l2);
      white-space: nowrap;
      text-align: start;
      text-overflow: ellipsis;
      background: none;
      border: none;
      cursor: pointer;
    }

    &[data-active] button[data-select] {
      color: var(--foreground-l0);
    }

    button[data-remove] {
      display: flex;
      flex-shrink: 0;
      padding: var(--space-3xs);
      color: var(--foreground-l4);
      background: none;
      border: none;
      cursor: pointer;

      &:hover {
        color: var(--foreground-destructive);
      }
    }
  }

  sponsor-empty,
  sponsor-placeholder {
    display: block;
    padding: var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-l4);
  }

  sponsor-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    min-inline-size: 0;
    flex: 1;
  }

  save-bar {
    position: sticky;
    inset-block-end: 0;
    display: flex;
    padding-block: var(--space-s);
    background: var(--background-l0);

    :global(button) {
      inline-size: 100%;
    }
  }
</style>
