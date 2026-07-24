<script lang="ts">
  import {
    ChallengeScoringKind,
    DynamicFlagMode,
    DynamicScoringTransport,
    type InstancerConfig,
  } from '@rctf/types'
  import MarkdownEditor from '$lib/components/markdown-editor.svelte'
  import {
    IconCaretDown,
    IconCloud,
    IconFile,
    IconGear,
    IconRobot,
    IconTrophy,
  } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Tabs from '$lib/ui/tabs.svelte'
  import TagInput from '$lib/ui/tag-input.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type {
    AdminBotConfig,
    EditorForm,
    ScoringConfig,
  } from '../model/editor-state'
  import AdminChallengesDetailsAdminbot from './adminbot.svelte'
  import AdminChallengesDetailsAttachments from './attachments.svelte'
  import FieldSelect from './field-select.svelte'
  import FormScroll from './form-scroll.svelte'
  import {
    detailsTabInvalid,
    inputToReleaseTime,
    releaseTimeToInput,
    scoringKindLocked,
    scoringTabInvalid,
    type FormErrors,
  } from './form-validation'
  import AdminChallengesDetailsInstancerProvider from './instancer-provider.svelte'
  import AdminChallengesDetailsInstancer from './instancer.svelte'
  import AdminChallengesDetailsSolves from './solves.svelte'

  interface Props {
    form: EditorForm
    disabled: boolean
    autofocusName: boolean
    totalSolves: number
    challengeId: string | null
    errors: FormErrors
    instancerValid?: boolean
    onFieldChange: <K extends keyof EditorForm>(
      field: K,
      value: EditorForm[K]
    ) => void
    onScoringChange: (scoring: ScoringConfig) => void
    onFilesChange: (files: EditorForm['files']) => void
    onInstancerChange: (config: InstancerConfig | null) => void
    onAdminBotChange: (config: AdminBotConfig) => void
  }

  let {
    form,
    disabled,
    autofocusName,
    totalSolves,
    challengeId,
    errors,
    instancerValid = $bindable(true),
    onFieldChange,
    onScoringChange,
    onFilesChange,
    onInstancerChange,
    onAdminBotChange,
  }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const flagPlaceholder = $derived(
    clientConfigQuery.data?.flagFormatPlaceholder ?? 'flag{...}'
  )

  const isDynamic = $derived(form.scoring.kind === ChallengeScoringKind.DYNAMIC)
  const dynamicSecret = $derived(
    form.scoring.kind === ChallengeScoringKind.DYNAMIC
      ? form.scoring.source.secret
      : ''
  )
  const kindLocked = $derived(scoringKindLocked(totalSolves))

  // Dynamic (per-team signed) flags only apply to normally-scored challenges.
  const dynamicFlagEnabled = $derived(!isDynamic && form.dynamicFlagEnabled)
  const dynamicFlagItems = $derived<MenuItem[]>([
    {
      value: 'static',
      label: 'Static flag',
      checked: !form.dynamicFlagEnabled,
      onSelect: () => onFieldChange('dynamicFlagEnabled', false),
    },
    {
      value: 'dynamic',
      label: 'Dynamic (per-team signed)',
      checked: form.dynamicFlagEnabled,
      onSelect: () => onFieldChange('dynamicFlagEnabled', true),
    },
  ])

  const dynamicFlagModeLabels: Record<DynamicFlagMode, string> = {
    [DynamicFlagMode.BASIC]: 'Basic (team id + signature suffix)',
    [DynamicFlagMode.LEET]: 'Leet (bits encoded via leetspeak)',
  }
  const dynamicFlagModeItems = $derived<MenuItem[]>(
    Object.values(DynamicFlagMode).map(mode => ({
      value: mode,
      label: dynamicFlagModeLabels[mode],
      checked: form.dynamicFlagMode === mode,
      onSelect: () => onFieldChange('dynamicFlagMode', mode),
    }))
  )

  let tab = $state('details')
  let nameFieldEl = $state<HTMLElement | null>(null)

  $effect(() => {
    if (autofocusName) {
      nameFieldEl?.querySelector('input')?.focus()
    }
  })

  let touched = $state({
    name: false,
    category: false,
    author: false,
    description: false,
    flag: false,
  })

  type TouchedField = keyof typeof touched
  const showError = (field: TouchedField) =>
    touched[field] && Boolean(errors[field])

  const tabItems = $derived([
    {
      value: 'details',
      label: 'Details',
      icon: IconFile,
      invalid: detailsTabInvalid(errors) || scoringTabInvalid(errors),
    },
    { value: 'instancer', label: 'Instancer', icon: IconCloud },
    ...(form.instancerConfig
      ? [
          {
            value: 'provider',
            label: 'Instancer config',
            icon: IconGear,
            invalid: !instancerValid,
          },
        ]
      : []),
    { value: 'adminbot', label: 'Admin bot', icon: IconRobot },
    ...(isDynamic
      ? []
      : [
          {
            value: 'solves',
            label: 'Solves',
            icon: IconTrophy,
            count: totalSolves || undefined,
          },
        ]),
  ])

  $effect(() => {
    if (isDynamic && tab === 'solves') tab = 'details'
    if (!form.instancerConfig) {
      if (tab === 'provider') tab = 'instancer'
      instancerValid = true
    }
  })

  function changeScoringKind(kind: ChallengeScoringKind) {
    if (kind === ChallengeScoringKind.DYNAMIC) {
      onFieldChange('flag', '')
      onScoringChange({
        kind: ChallengeScoringKind.DYNAMIC,
        source: {
          transport: DynamicScoringTransport.WEBHOOK,
          secret: dynamicSecret || crypto.randomUUID(),
        },
      })
    } else {
      onScoringChange({ kind: ChallengeScoringKind.DECAY })
    }
  }

  function changeDynamicSecret(secret: string) {
    onScoringChange({
      kind: ChallengeScoringKind.DYNAMIC,
      source: { transport: DynamicScoringTransport.WEBHOOK, secret },
    })
  }

  const kindLabel = $derived(isDynamic ? 'Dynamic' : 'Decay')
  const kindItems = $derived<MenuItem[]>([
    {
      value: ChallengeScoringKind.DECAY,
      label: 'Decay',
      checked: !isDynamic,
      onSelect: () => changeScoringKind(ChallengeScoringKind.DECAY),
    },
    {
      value: ChallengeScoringKind.DYNAMIC,
      label: 'Dynamic',
      checked: isDynamic,
      onSelect: () => changeScoringKind(ChallengeScoringKind.DYNAMIC),
    },
  ])

  const tiebreakItems = $derived<MenuItem[]>([
    {
      value: 'yes',
      label: 'Eligible',
      checked: form.tiebreakEligible,
      onSelect: () => onFieldChange('tiebreakEligible', true),
    },
    {
      value: 'no',
      label: 'Ineligible',
      checked: !form.tiebreakEligible,
      onSelect: () => onFieldChange('tiebreakEligible', false),
    },
  ])

  const visibilityItems = $derived<MenuItem[]>([
    {
      value: 'visible',
      label: 'Visible to players',
      checked: !form.hidden,
      onSelect: () => onFieldChange('hidden', false),
    },
    {
      value: 'hidden',
      label: 'Hidden from players',
      checked: form.hidden,
      onSelect: () => onFieldChange('hidden', true),
    },
  ])
</script>

<challenge-form>
  {#snippet fieldError(field: TouchedField)}
    {#if showError(field)}<field-error>{errors[field]}</field-error>{/if}
  {/snippet}

  <form-tabs>
    <Tabs bind:value={tab} tabs={tabItems}>
      {#snippet content({ value })}
        {#if value === 'details'}
          <FormScroll {disabled}>
            <Section title="Details">
              <section-fields>
                <field-grid>
                  <form-field
                    bind:this={nameFieldEl}
                    data-invalid={showError('name') ? '' : undefined}
                  >
                    <field-label>Name<req>*</req></field-label>
                    <Input
                      type="text"
                      placeholder="Challenge name"
                      value={form.name}
                      {disabled}
                      aria-invalid={showError('name')}
                      oninput={e =>
                        onFieldChange('name', e.currentTarget.value)}
                      onblur={() => (touched.name = true)}
                    />
                    {@render fieldError('name')}
                  </form-field>
                  <form-field
                    data-invalid={showError('category') ? '' : undefined}
                  >
                    <field-label>Category<req>*</req></field-label>
                    <Input
                      type="text"
                      placeholder="web, pwn, crypto, etc."
                      value={form.category}
                      {disabled}
                      aria-invalid={showError('category')}
                      oninput={e =>
                        onFieldChange('category', e.currentTarget.value)}
                      onblur={() => (touched.category = true)}
                    />
                    {@render fieldError('category')}
                  </form-field>
                </field-grid>

                <form-field data-invalid={showError('author') ? '' : undefined}>
                  <field-label>Author<req>*</req></field-label>
                  <Input
                    type="text"
                    placeholder="Challenge author"
                    value={form.author}
                    {disabled}
                    aria-invalid={showError('author')}
                    oninput={e =>
                      onFieldChange('author', e.currentTarget.value)}
                    onblur={() => (touched.author = true)}
                  />
                  {@render fieldError('author')}
                </form-field>

                <form-field>
                  <field-label>Tags</field-label>
                  <TagInput
                    value={form.tags}
                    {disabled}
                    aria-label="Add tag"
                    emptyPlaceholder="web, easy, jwt..."
                    validate={tag =>
                      !tag.includes(',') && !form.tags.includes(tag)}
                    onchange={tags => onFieldChange('tags', tags)}
                  />
                </form-field>

                <form-field
                  data-invalid={showError('description') ? '' : undefined}
                >
                  <field-label>
                    Description<req>*</req>
                    <field-hint>(Markdown supported)</field-hint>
                  </field-label>
                  <MarkdownEditor
                    label="Challenge description"
                    placeholder="Challenge description (Markdown supported)"
                    rows={12}
                    value={form.description}
                    {disabled}
                    invalid={showError('description')}
                    oninput={value => onFieldChange('description', value)}
                    onblur={() => (touched.description = true)}
                  />
                  {@render fieldError('description')}
                </form-field>

                {#if isDynamic}
                  <form-field>
                    <field-label>
                      Flag
                      <field-hint>(unused for dynamic scoring)</field-hint>
                    </field-label>
                    <Input
                      type="text"
                      data-mono
                      placeholder={flagPlaceholder}
                      value=""
                      disabled
                    />
                  </form-field>
                {:else}
                  <form-field>
                    <field-label>Flag type</field-label>
                    <FieldSelect
                      label={form.dynamicFlagEnabled
                        ? 'Dynamic (per-team signed)'
                        : 'Static flag'}
                      items={dynamicFlagItems}
                      {disabled}
                    />
                  </form-field>

                  <form-field data-invalid={showError('flag') ? '' : undefined}>
                    <field-label>
                      Flag<req>*</req>
                      {#if dynamicFlagEnabled}
                        <field-hint
                          >(signed per team before delivery)</field-hint
                        >
                      {/if}
                    </field-label>
                    <Input
                      type="text"
                      data-mono
                      placeholder={flagPlaceholder}
                      value={form.flag}
                      {disabled}
                      aria-invalid={showError('flag')}
                      oninput={e =>
                        onFieldChange('flag', e.currentTarget.value)}
                      onblur={() => (touched.flag = true)}
                    />
                    {@render fieldError('flag')}
                  </form-field>

                  {#if dynamicFlagEnabled}
                    <form-field>
                      <field-label>
                        Signing mode
                        <field-hint>(passed to the signing function)</field-hint
                        >
                      </field-label>
                      <FieldSelect
                        label={dynamicFlagModeLabels[form.dynamicFlagMode]}
                        items={dynamicFlagModeItems}
                        {disabled}
                      />
                    </form-field>
                  {/if}
                {/if}
              </section-fields>
            </Section>

            <Section title="Scoring">
              <section-fields>
                <form-field>
                  <field-label>
                    Scoring kind
                    {#if kindLocked}<field-hint
                        >(locked: challenge has solves)</field-hint
                      >{/if}
                  </field-label>
                  {#if kindLocked}
                    <Tooltip
                      label="Delete all solves before changing the scoring kind."
                    >
                      {#snippet children({ props })}
                        <button
                          type="button"
                          data-field-trigger
                          data-disabled
                          {...props}
                        >
                          {kindLabel}<IconCaretDown />
                        </button>
                      {/snippet}
                    </Tooltip>
                  {:else}
                    <FieldSelect
                      label={kindLabel}
                      items={kindItems}
                      {disabled}
                    />
                  {/if}
                </form-field>

                {#if isDynamic}
                  <form-field data-invalid={errors.secret ? '' : undefined}>
                    <field-label>
                      Webhook secret
                      <field-hint
                        >(shared secret for the {DynamicScoringTransport.WEBHOOK}
                        transport)</field-hint
                      >
                      <label-action>
                        <Button
                          variant="secondary"
                          size="sm"
                          {disabled}
                          onclick={() =>
                            changeDynamicSecret(crypto.randomUUID())}
                        >
                          Regenerate
                        </Button>
                      </label-action>
                    </field-label>
                    <Input
                      type="text"
                      data-mono
                      value={dynamicSecret}
                      {disabled}
                      aria-invalid={Boolean(errors.secret)}
                      oninput={e => changeDynamicSecret(e.currentTarget.value)}
                    />
                    {#if errors.secret}<field-error>{errors.secret}</field-error
                      >{/if}
                  </form-field>
                {/if}

                <field-grid data-dimmed={isDynamic ? '' : undefined}>
                  <form-field>
                    <field-label>
                      Minimum points
                      <field-hint
                        >{isDynamic
                          ? '(unused for dynamic)'
                          : '(at max solves)'}</field-hint
                      >
                    </field-label>
                    <Input
                      type="number"
                      min={0}
                      value={form.pointsMin}
                      disabled={disabled || isDynamic}
                      onchange={e =>
                        onFieldChange('pointsMin', +e.currentTarget.value)}
                    />
                  </form-field>
                  <form-field>
                    <field-label>
                      Maximum points
                      <field-hint
                        >{isDynamic
                          ? '(unused for dynamic)'
                          : '(at zero solves)'}</field-hint
                      >
                    </field-label>
                    <Input
                      type="number"
                      min={0}
                      value={form.pointsMax}
                      disabled={disabled || isDynamic}
                      onchange={e =>
                        onFieldChange('pointsMax', +e.currentTarget.value)}
                    />
                  </form-field>
                </field-grid>

                <field-grid>
                  <form-field>
                    <field-label
                      >Sort weight <field-hint>(higher = first)</field-hint
                      ></field-label
                    >
                    <Input
                      type="number"
                      value={form.sortWeight}
                      {disabled}
                      onchange={e =>
                        onFieldChange('sortWeight', +e.currentTarget.value)}
                    />
                  </form-field>
                  <form-field>
                    <field-label>Tiebreak eligibility</field-label>
                    <FieldSelect
                      label={form.tiebreakEligible ? 'Eligible' : 'Ineligible'}
                      items={tiebreakItems}
                      {disabled}
                    />
                  </form-field>
                </field-grid>

                <form-field>
                  <field-label>Visibility</field-label>
                  <FieldSelect
                    label={form.hidden
                      ? 'Hidden from players'
                      : 'Visible to players'}
                    items={visibilityItems}
                    {disabled}
                  />
                </form-field>

                <form-field>
                  <field-label>
                    Release time
                    {#if form.releaseTime !== null}
                      <label-action>
                        <Button
                          variant="ghost"
                          size="sm"
                          {disabled}
                          onclick={() => onFieldChange('releaseTime', null)}
                        >
                          Clear
                        </Button>
                      </label-action>
                    {/if}
                  </field-label>
                  <Input
                    type="datetime-local"
                    value={releaseTimeToInput(form.releaseTime)}
                    {disabled}
                    onchange={e =>
                      onFieldChange(
                        'releaseTime',
                        inputToReleaseTime(e.currentTarget.value)
                      )}
                  />
                </form-field>
              </section-fields>
            </Section>

            <Section title="Files">
              <AdminChallengesDetailsAttachments
                files={form.files}
                {disabled}
                {onFilesChange}
              />
            </Section>
          </FormScroll>
        {:else if value === 'instancer'}
          {#key challengeId}
            <AdminChallengesDetailsInstancer
              config={form.instancerConfig}
              {challengeId}
              {disabled}
              onChange={onInstancerChange}
            />
          {/key}
        {:else if value === 'provider'}
          {#key challengeId}
            <AdminChallengesDetailsInstancerProvider
              config={form.instancerConfig}
              {disabled}
              bind:valid={instancerValid}
              onChange={onInstancerChange}
            />
          {/key}
        {:else if value === 'adminbot'}
          <AdminChallengesDetailsAdminbot
            config={form.adminBotConfig}
            {disabled}
            onChange={onAdminBotChange}
          />
        {:else if value === 'solves'}
          <AdminChallengesDetailsSolves {challengeId} {totalSolves} />
        {/if}
      {/snippet}
    </Tabs>
  </form-tabs>
</challenge-form>

<style>
  challenge-form {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  form-tabs {
    container: challenge-tabs / inline-size;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;

    > :global([data-scope='tabs'][data-part='root']) {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-block-size: 0;
    }

    :global([data-scope='tabs'][data-part='list']) {
      padding-inline: 1.25rem;
      overflow-x: auto;
      overscroll-behavior: none;
    }

    :global([data-scope='tabs'][data-part='content']:not([hidden])) {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-block-size: 0;
      overflow: hidden;
      background: var(--background-l2);
    }
  }

  @container challenge-tabs (width < 46rem) {
    form-tabs :global([data-scope='tabs'][data-part='list']) {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-3xs);
      padding: var(--space-2xs) var(--space-s) var(--space-s);
      overflow-x: visible;
    }

    form-tabs :global([data-scope='tabs'][data-part='trigger']) {
      justify-content: center;
      border-radius: var(--radius-md);
      background: var(--background-l2);
    }

    form-tabs :global([data-scope='tabs'][data-part='trigger'][data-selected]) {
      background: var(--background-l3);
    }
  }

  section-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  field-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    @container challenge-details (width >= 40rem) {
      grid-template-columns: 1fr 1fr;
    }

    &[data-dimmed] {
      opacity: 0.5;
    }
  }

  form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;

    &[data-invalid] field-label {
      color: var(--foreground-destructive);
    }
  }

  :global(input[data-mono]) {
    font-family: var(--font-mono);
  }

  field-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--space-3xs);
    font-size: var(--step--1);
    color: var(--foreground-l2);
  }

  req {
    color: var(--foreground-destructive);
  }

  field-hint {
    color: var(--foreground-l4);
  }

  label-action {
    margin-inline-start: auto;
  }

  field-error {
    font-size: var(--step--1);
    color: var(--foreground-destructive);
  }

  [data-field-trigger] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    text-align: start;
    cursor: pointer;
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[data-disabled] {
      cursor: default;
      opacity: 0.5;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--foreground-l3);
    }
  }
</style>
