<script lang="ts">
  import { ChallengeScoringKind, DynamicScoringTransport, type InstancerConfig } from '@rctf/types'
  import Markdown from '$lib/components/markdown.svelte'
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconCloudComputingFilled from '$lib/icons/icon-cloud-computing-filled.svelte'
  import IconEyeFilled from '$lib/icons/icon-eye-filled.svelte'
  import IconFileFilled from '$lib/icons/icon-file-filled.svelte'
  import IconFileInfoFilled from '$lib/icons/icon-file-info-filled.svelte'
  import IconFlagFilled from '$lib/icons/icon-flag-filled.svelte'
  import IconRobot from '$lib/icons/icon-robot.svelte'
  import IconTrophyFilled from '$lib/icons/icon-trophy-filled.svelte'
  import { useClientConfig } from '$lib/query/config'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Tabs from '$lib/ui/tabs.svelte'
  import Textarea from '$lib/ui/textarea.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { AdminBotConfig, EditorForm, ScoringConfig } from '../model/editor-state'
  import AdminChallengesDetailsAdminbot from './adminbot.svelte'
  import AdminChallengesDetailsAttachments from './attachments.svelte'
  import FieldSelect from './field-select.svelte'
  import {
    detailsTabInvalid,
    inputToReleaseTime,
    releaseTimeToInput,
    scoringKindLocked,
    scoringTabInvalid,
    type FormErrors,
  } from './form-validation'
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
    onFieldChange: <K extends keyof EditorForm>(field: K, value: EditorForm[K]) => void
    onScoringChange: (scoring: ScoringConfig) => void
    onFilesChange: (files: EditorForm['files']) => void
    onInstancerChange: (config: InstancerConfig | null) => void
    onAdminBotChange: (config: AdminBotConfig) => void
    onShowPreview: () => void
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
    onShowPreview,
  }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const flagPlaceholder = $derived(clientConfigQuery.data?.flagFormatPlaceholder ?? 'flag{...}')

  const isDynamic = $derived(form.scoring.kind === ChallengeScoringKind.DYNAMIC)
  const dynamicSecret = $derived(
    form.scoring.kind === ChallengeScoringKind.DYNAMIC ? form.scoring.source.secret : ''
  )
  const kindLocked = $derived(scoringKindLocked(totalSolves))

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

  const tabItems = $derived([
    {
      value: 'details',
      label: 'Details',
      icon: IconFileInfoFilled,
      invalid: detailsTabInvalid(errors),
    },
    {
      value: 'scoring',
      label: 'Scoring',
      icon: IconFlagFilled,
      invalid: scoringTabInvalid(errors),
    },
    {
      value: 'files',
      label: 'Files',
      icon: IconFileFilled,
      count: form.files.length || undefined,
    },
    {
      value: 'instancer',
      label: 'Instancer',
      icon: IconCloudComputingFilled,
      invalid: !instancerValid,
    },
    { value: 'adminbot', label: 'Admin bot', icon: IconRobot },
    ...(isDynamic
      ? []
      : [
          {
            value: 'solves',
            label: 'Solves',
            icon: IconTrophyFilled,
            count: totalSolves || undefined,
          },
        ]),
  ])

  $effect(() => {
    if (isDynamic && tab === 'solves') tab = 'details'
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

  function parseTags(value: string): string[] {
    return [
      ...new Set(
        value
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      ),
    ]
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
  <form-tabs>
    <Tabs bind:value={tab} tabs={tabItems}>
      {#snippet content({ value })}
        {#if value === 'details'}
          <form-scroll data-mode={disabled ? 'view' : 'edit'}>
            <field-grid>
              <form-field
                bind:this={nameFieldEl}
                data-invalid={touched.name && errors.name ? '' : undefined}
              >
                <field-label>Name<req>*</req></field-label>
                <Input
                  type="text"
                  placeholder="Challenge name"
                  value={form.name}
                  {disabled}
                  aria-invalid={touched.name && Boolean(errors.name)}
                  oninput={e => onFieldChange('name', e.currentTarget.value)}
                  onblur={() => (touched.name = true)}
                />
                {#if touched.name && errors.name}<field-error>{errors.name}</field-error>{/if}
              </form-field>
              <form-field data-invalid={touched.category && errors.category ? '' : undefined}>
                <field-label>Category<req>*</req></field-label>
                <Input
                  type="text"
                  placeholder="web, pwn, crypto, etc."
                  value={form.category}
                  {disabled}
                  aria-invalid={touched.category && Boolean(errors.category)}
                  oninput={e => onFieldChange('category', e.currentTarget.value)}
                  onblur={() => (touched.category = true)}
                />
                {#if touched.category && errors.category}
                  <field-error>{errors.category}</field-error>
                {/if}
              </form-field>
            </field-grid>

            <form-field data-invalid={touched.author && errors.author ? '' : undefined}>
              <field-label>Author<req>*</req></field-label>
              <Input
                type="text"
                placeholder="Challenge author"
                value={form.author}
                {disabled}
                aria-invalid={touched.author && Boolean(errors.author)}
                oninput={e => onFieldChange('author', e.currentTarget.value)}
                onblur={() => (touched.author = true)}
              />
              {#if touched.author && errors.author}<field-error>{errors.author}</field-error>{/if}
            </form-field>

            <form-field>
              <field-label>Tags <field-hint>(comma-separated)</field-hint></field-label>
              <Input
                type="text"
                placeholder="web, easy, jwt"
                value={form.tags.join(', ')}
                {disabled}
                onchange={e => onFieldChange('tags', parseTags(e.currentTarget.value))}
              />
            </form-field>

            <form-field data-invalid={touched.description && errors.description ? '' : undefined}>
              <field-label>
                Description<req>*</req>
                <field-hint>(Markdown supported)</field-hint>
                <label-action>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!form.description}
                    onclick={onShowPreview}
                  >
                    <IconEyeFilled />
                    Preview
                  </Button>
                </label-action>
              </field-label>
              <Textarea
                placeholder="Challenge description (Markdown supported)"
                rows={12}
                value={form.description}
                {disabled}
                aria-invalid={touched.description && Boolean(errors.description)}
                oninput={e => onFieldChange('description', e.currentTarget.value)}
                onblur={() => (touched.description = true)}
              ></Textarea>
              {#if touched.description && errors.description}
                <field-error>{errors.description}</field-error>
              {/if}
            </form-field>

            <form-field data-invalid={touched.flag && errors.flag ? '' : undefined}>
              <field-label>
                Flag{#if !isDynamic}<req>*</req>{/if}
                {#if isDynamic}<field-hint>(unused for dynamic)</field-hint>{/if}
              </field-label>
              <Input
                type="text"
                data-mono
                placeholder={flagPlaceholder}
                value={isDynamic ? '' : form.flag}
                disabled={disabled || isDynamic}
                aria-invalid={touched.flag && Boolean(errors.flag)}
                oninput={e => onFieldChange('flag', e.currentTarget.value)}
                onblur={() => (touched.flag = true)}
              />
              {#if touched.flag && errors.flag}<field-error>{errors.flag}</field-error>{/if}
            </form-field>
          </form-scroll>
        {:else if value === 'scoring'}
          <form-scroll data-mode={disabled ? 'view' : 'edit'}>
            <form-field>
              <field-label>
                Scoring kind
                {#if kindLocked}<field-hint>(locked: challenge has solves)</field-hint>{/if}
              </field-label>
              {#if kindLocked}
                <Tooltip label="Delete all solves before changing the scoring kind.">
                  {#snippet children({ props })}
                    <button type="button" data-field-trigger data-disabled {...props}>
                      {kindLabel}<IconChevronDown />
                    </button>
                  {/snippet}
                </Tooltip>
              {:else}
                <FieldSelect label={kindLabel} items={kindItems} {disabled} />
              {/if}
            </form-field>

            {#if isDynamic}
              <form-field data-invalid={errors.secret ? '' : undefined}>
                <field-label>
                  Webhook secret
                  <field-hint
                    >(shared secret for the {DynamicScoringTransport.WEBHOOK} transport)</field-hint
                  >
                  <label-action>
                    <Button
                      variant="secondary"
                      size="sm"
                      {disabled}
                      onclick={() => changeDynamicSecret(crypto.randomUUID())}
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
                {#if errors.secret}<field-error>{errors.secret}</field-error>{/if}
              </form-field>
            {/if}

            <field-grid data-dimmed={isDynamic ? '' : undefined}>
              <form-field>
                <field-label>
                  Minimum points
                  <field-hint>{isDynamic ? '(unused for dynamic)' : '(at max solves)'}</field-hint>
                </field-label>
                <Input
                  type="number"
                  min={0}
                  value={form.pointsMin}
                  disabled={disabled || isDynamic}
                  onchange={e => onFieldChange('pointsMin', +e.currentTarget.value)}
                />
              </form-field>
              <form-field>
                <field-label>
                  Maximum points
                  <field-hint>{isDynamic ? '(unused for dynamic)' : '(at zero solves)'}</field-hint>
                </field-label>
                <Input
                  type="number"
                  min={0}
                  value={form.pointsMax}
                  disabled={disabled || isDynamic}
                  onchange={e => onFieldChange('pointsMax', +e.currentTarget.value)}
                />
              </form-field>
            </field-grid>

            <field-grid>
              <form-field>
                <field-label>Sort weight <field-hint>(higher = first)</field-hint></field-label>
                <Input
                  type="number"
                  value={form.sortWeight}
                  {disabled}
                  onchange={e => onFieldChange('sortWeight', +e.currentTarget.value)}
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
                label={form.hidden ? 'Hidden from players' : 'Visible to players'}
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
                  onFieldChange('releaseTime', inputToReleaseTime(e.currentTarget.value))}
              />
            </form-field>
          </form-scroll>
        {:else if value === 'files'}
          <AdminChallengesDetailsAttachments files={form.files} {disabled} {onFilesChange} />
        {:else if value === 'instancer'}
          {#key challengeId}
            <AdminChallengesDetailsInstancer
              config={form.instancerConfig}
              {challengeId}
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
      padding-inline: var(--space-l);
      overflow-x: auto;
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

  form-scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: var(--space-s) var(--space-l) var(--space-l);
    overflow-y: auto;

    &[data-mode='view'] {
      opacity: 0.6;
    }
  }

  field-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    @media (width >= 40rem) {
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
    align-items: center;
    gap: var(--space-3xs);
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
