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
  import MarkdownEditor from '$lib/components/markdown-editor.svelte'
  import { IconCloud, IconTrash, IconWarningCircle, IconX } from '$lib/icons'
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
  import StatusCard from '$lib/ui/status-card.svelte'
  import { hasPermissions } from '$lib/utils/permissions'
  import ExternalAuthClients from './external-auth-clients.svelte'
  import {
    buildPatch,
    clearDirty,
    formatDatetimeLocal,
    groupMatchesDefaults,
    initialFormState,
    parseDatetimeLocal,
    resetGroup,
    sponsorsReducer,
    validateTiming,
    type SettingsFormState,
    type SponsorAction,
  } from './settings-model'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const settingsQuery = useAdminSettings()

  const revealAfterLoading = settingsQuery.isPending

  const user = $derived(userQuery.data)
  const ctfName = $derived(configQuery.data?.ctfName)
  const defaults = $derived(settingsQuery.data?.defaults)
  const canManageSettings = $derived(hasPermissions(user, Permissions.settingsWrite))
  const canManageApps = $derived(hasPermissions(user, Permissions.usersWrite))

  let form = $state<SettingsFormState | null>(null)
  let sponsorSelected = $state(0)
  let initialized = $state(false)
  let saving = $state(false)
  let logoUploading = $state(false)
  let logoInputs = $state<Record<'light' | 'dark', HTMLInputElement | null>>({
    light: null,
    dark: null,
  })

  const logoTargets = [
    { key: 'light' as const, label: 'Light mode', fallback: wordmarkLight },
    { key: 'dark' as const, label: 'Dark mode', fallback: wordmarkDark },
  ]

  $effect(() => {
    const data = settingsQuery.data
    if (!data || initialized) return
    form = initialFormState(data.overrides, data.defaults)
    sponsorSelected = 0
    initialized = true
  })

  const timingError = $derived(
    form && defaults
      ? validateTiming(
          form.timing.startTime,
          form.timing.endTime,
          !groupMatchesDefaults(form, 'timing', defaults)
        )
      : null
  )
  const selectedSponsor = $derived(form?.sponsors.list[sponsorSelected])

  function markGroup(key: keyof SettingsFormState) {
    if (!form) return
    form[key].dirty = true
  }

  function resetGeneral() {
    if (!form || !defaults) return
    form.ctfName = resetGroup(defaults, 'ctfName')
    form.faviconUrl = resetGroup(defaults, 'faviconUrl')
  }

  function resetTiming() {
    if (!form || !defaults) return
    form.timing = resetGroup(defaults, 'timing')
  }

  function resetLogo() {
    if (!form || !defaults) return
    form.logo = resetGroup(defaults, 'logo')
  }

  function resetHome() {
    if (!form || !defaults) return
    form.homeContent = resetGroup(defaults, 'homeContent')
  }

  function resetMeta() {
    if (!form || !defaults) return
    form.meta = resetGroup(defaults, 'meta')
  }

  function resetSponsors() {
    if (!form || !defaults) return
    form.sponsors = resetGroup(defaults, 'sponsors')
    sponsorSelected = 0
  }

  function dispatchSponsors(action: SponsorAction) {
    if (!form) return
    const next = sponsorsReducer({ list: form.sponsors.list, selected: sponsorSelected }, action)
    form.sponsors.list = next.list
    sponsorSelected = next.selected
    if (action.type !== 'select') markGroup('sponsors')
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
        markGroup('logo')
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
    markGroup('logo')
  }

  async function save() {
    if (!form || !defaults) return
    const error = validateTiming(
      form.timing.startTime,
      form.timing.endTime,
      !groupMatchesDefaults(form, 'timing', defaults)
    )
    if (error) {
      toast.error(error)
      return
    }
    const patch = buildPatch(form, defaults)
    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save.')
      return
    }
    saving = true
    try {
      const response = await apiRequest(UpdateAdminSettingsRouteV2, { data: patch })
      if (response.kind === GoodAdminSettingsUpdate.kind) {
        toast.success('Settings saved.')
        clearDirty(form)
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

{#snippet groupHeader(title: string, onReset: () => void)}
  <group-header>
    <group-title>{title}</group-title>
    <button type="button" data-reset onclick={onReset}>Reset to default</button>
  </group-header>
{/snippet}

{#if !canManageSettings && user}
  <settings-status>
    <StatusCard
      icon={IconWarningCircle}
      title="Access denied"
      subtitle="Your account does not have permission to manage settings."
    >
      <Button href="/admin/challenges">Back to admin</Button>
    </StatusCard>
  </settings-status>
{:else if form && defaults}
  {@const settingsDefaults = defaults}
  {@const settingsForm = form}
  <settings-page data-reveal={revealAfterLoading || undefined}>
    <settings-form>
      <settings-group>
        {@render groupHeader('General', resetGeneral)}
        <group-body>
          <Field label="CTF name">
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                aria-describedby={describedBy}
                value={settingsForm.ctfName.value}
                placeholder={settingsDefaults.ctfName}
                oninput={e => {
                  settingsForm.ctfName.value = e.currentTarget.value
                  markGroup('ctfName')
                }}
              />
            {/snippet}
          </Field>
          <Field label="Favicon URL">
            {#snippet children({ id, describedBy })}
              <Input
                {id}
                aria-describedby={describedBy}
                value={settingsForm.faviconUrl.value}
                placeholder={settingsDefaults.faviconUrl}
                oninput={e => {
                  settingsForm.faviconUrl.value = e.currentTarget.value
                  markGroup('faviconUrl')
                }}
              />
            {/snippet}
          </Field>
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Timing', resetTiming)}
        <group-body>
          <timing-grid>
            <Field label="CTF start (local time)">
              {#snippet children({ id, describedBy })}
                <Input
                  {id}
                  aria-describedby={describedBy}
                  type="datetime-local"
                  value={formatDatetimeLocal(settingsForm.timing.startTime)}
                  onchange={e => {
                    settingsForm.timing.startTime = parseDatetimeLocal(e.currentTarget.value)
                    markGroup('timing')
                  }}
                />
              {/snippet}
            </Field>
            <Field label="CTF end (local time)">
              {#snippet children({ id, describedBy })}
                <Input
                  {id}
                  aria-describedby={describedBy}
                  type="datetime-local"
                  value={formatDatetimeLocal(settingsForm.timing.endTime)}
                  onchange={e => {
                    settingsForm.timing.endTime = parseDatetimeLocal(e.currentTarget.value)
                    markGroup('timing')
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
        {@render groupHeader('Logo', resetLogo)}
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
                      aria-label="Remove {target.label} logo"
                      onclick={() => removeLogo(target.key)}
                      disabled={logoUploading}
                    >
                      <IconTrash />
                    </Button>
                  {/if}
                </logo-actions>
              </logo-controls>
            </logo-row>
          {/each}
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Home content', resetHome)}
        <group-body>
          <MarkdownEditor
            value={settingsForm.homeContent.value}
            label="Home content"
            placeholder="Markdown content for the home page..."
            oninput={value => {
              settingsForm.homeContent.value = value
              markGroup('homeContent')
            }}
          />
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Open Graph', resetMeta)}
        <group-body>
          <Field label="OG Description">
            {#snippet children({ id })}
              <Input
                {id}
                value={settingsForm.meta.description}
                placeholder={settingsDefaults.meta?.description}
                oninput={e => {
                  settingsForm.meta.description = e.currentTarget.value
                  markGroup('meta')
                }}
              />
            {/snippet}
          </Field>
          <Field label="OG Image URL">
            {#snippet children({ id })}
              <Input
                {id}
                value={settingsForm.meta.imageUrl}
                placeholder={settingsDefaults.meta?.imageUrl}
                oninput={e => {
                  settingsForm.meta.imageUrl = e.currentTarget.value
                  markGroup('meta')
                }}
              />
            {/snippet}
          </Field>
        </group-body>
      </settings-group>

      <settings-group>
        {@render groupHeader('Sponsors', resetSponsors)}
        <group-body data-flush>
          <sponsors-editor>
            <sponsor-list>
              <sponsor-items>
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
              </sponsor-items>
              <sponsor-footer>
                <Button size="sm" onclick={() => dispatchSponsors({ type: 'add' })}>Add</Button>
              </sponsor-footer>
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
                <Field label="Description" description="Markdown supported.">
                  <MarkdownEditor
                    rows={4}
                    value={sponsor.description}
                    label="Sponsor description"
                    placeholder="Sponsor description"
                    oninput={value =>
                      dispatchSponsors({
                        type: 'update',
                        index: sponsorSelected,
                        field: 'description',
                        value,
                      })}
                  />
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
      <bar-fade aria-hidden="true"></bar-fade>
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

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }

    p {
      margin: 0;
      color: var(--foreground-l3);
    }
  }

  settings-page {
    display: block;
    inline-size: 100%;
    max-inline-size: 48rem;
    margin-inline: auto;
    padding-inline: var(--space-m);
  }

  settings-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  settings-group {
    display: block;
    overflow: clip;
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    padding: 0.375rem var(--space-s);
    background: var(--background-l3);
  }

  group-title {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
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
    gap: 0.75rem;
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

  sponsors-editor {
    display: flex;
    flex-direction: column;
    min-block-size: 12rem;

    @media (min-width: 40rem) {
      flex-direction: row;
    }
  }

  sponsor-list {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    border-block-end: 2px solid var(--border);

    @media (min-width: 40rem) {
      inline-size: 11rem;
      border-block-end: none;
      border-inline-end: 2px solid var(--border);
    }
  }

  sponsor-items {
    display: flex;
    flex: 1;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-3xs);
    padding: var(--space-2xs);
    overflow: hidden;

    @media (min-width: 40rem) {
      flex-direction: column;
      flex-wrap: nowrap;
      gap: 2px;
    }
  }

  sponsor-footer {
    display: flex;
    flex-shrink: 0;
    padding: var(--space-2xs);
    border-block-start: 2px solid var(--border);

    :global(button) {
      inline-size: 100%;
    }
  }

  sponsor-item {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    max-inline-size: 100%;
    border-radius: var(--radius-md);
    color: var(--foreground-l4);

    &:hover {
      background: var(--background-l3);
      color: var(--foreground-l0);
    }

    &[data-active] {
      background: var(--background-l4);
      color: var(--foreground-l0);
    }

    @media (min-width: 40rem) {
      inline-size: 100%;
    }

    button[data-select] {
      overflow: hidden;
      flex: 1;
      padding: 0.375rem var(--space-2xs);
      color: inherit;
      font-size: var(--step--1);
      white-space: nowrap;
      text-align: start;
      text-overflow: ellipsis;
      background: none;
      border: none;
      cursor: pointer;
    }

    button[data-remove] {
      display: flex;
      flex-shrink: 0;
      margin-inline-end: var(--space-3xs);
      padding: 0.125rem;
      color: inherit;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      opacity: 0;

      :global(svg) {
        inline-size: 0.75rem;
        block-size: 0.75rem;
      }

      &:hover {
        color: var(--foreground-destructive);
        background: var(--background-destructive);
      }

      &:focus-visible {
        opacity: 1;
      }
    }

    &:hover button[data-remove],
    &[data-active] button[data-remove] {
      opacity: 1;
    }
  }

  sponsor-empty,
  sponsor-placeholder {
    display: block;
    padding: 0.375rem var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-l4);
  }

  sponsor-placeholder {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 100%;
  }

  sponsor-detail {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-inline-size: 0;
    flex: 1;
    padding: var(--space-s);
  }

  save-bar {
    position: sticky;
    inset-block-end: 0;
    z-index: 1;
    display: flex;
    padding-block: var(--space-s);
    background: var(--background-l0);

    :global(button) {
      inline-size: 100%;
    }
  }

  bar-fade {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 100%;
    display: block;
    block-size: 1.5rem;
    pointer-events: none;
    background: linear-gradient(to top, var(--background-l0), transparent);
    opacity: 0;

    @supports (animation-timeline: scroll()) {
      animation: bar-fade-out linear both;
      animation-timeline: scroll(root);
      animation-range: calc(100% - 1.5rem) 100%;
    }
  }

  @keyframes bar-fade-out {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }
</style>
