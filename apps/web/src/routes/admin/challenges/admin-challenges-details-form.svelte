<script lang="ts">
  import type { InstancerConfig } from '@rctf/types'
  import {
    Button,
    Field,
    Input,
    ScrollArea,
    Select,
    Tabs,
    Textarea,
    Tooltip,
  } from '$lib/components'
  import {
    IconAlertCircleFilled,
    IconCloudComputingFilled,
    IconEyeFilled,
    IconFileFilled,
    IconFileInfoFilled,
    IconFlagFilled,
    IconRobot,
    IconTrophyFilled,
  } from '$lib/icons'
  import type { AdminBotConfig } from '$lib/machines'
  import { useClientConfig } from '$lib/query'
  import { cn } from '$lib/utils'
  import type { Snippet } from 'svelte'
  import AdminChallengesDetailsAdminbot from './admin-challenges-details-adminbot.svelte'
  import AdminChallengesDetailsAttachments from './admin-challenges-details-attachments.svelte'
  import AdminChallengesDetailsInstancer from './admin-challenges-details-instancer.svelte'
  import AdminChallengesDetailsSolves from './admin-challenges-details-solves.svelte'

  interface Props {
    name: string
    category: string
    author: string
    description: string
    flag: string
    pointsMin: number
    pointsMax: number
    tiebreakEligible: boolean
    sortWeight: number
    files: { name: string; url: string; size: number | null }[]
    instancerConfig: InstancerConfig | null
    adminBotConfig: AdminBotConfig
    hidden: boolean
    challengeId: string | null
    totalSolves: number
    isDisabled: boolean
    formValid?: boolean
    instancerValid?: boolean
    actions?: Snippet
    onShowPreview: () => void
    onFilesChange: (files: Props['files']) => void
    onInstancerConfigChange: (config: InstancerConfig | null) => void
    onAdminBotConfigChange: (config: AdminBotConfig) => void
    onNameChange: (v: string) => void
    onCategoryChange: (v: string) => void
    onAuthorChange: (v: string) => void
    onDescriptionChange: (v: string) => void
    onFlagChange: (v: string) => void
    onPointsMinChange: (v: number) => void
    onPointsMaxChange: (v: number) => void
    onTiebreakEligibleChange: (v: boolean) => void
    onSortWeightChange: (v: number) => void
    onHiddenChange: (v: boolean) => void
    onReleaseTimeChange: (v: number | null) => void
    releaseTime: number | null
  }

  let {
    name,
    category,
    author,
    description,
    flag,
    pointsMin,
    pointsMax,
    tiebreakEligible,
    sortWeight,
    files,
    instancerConfig,
    adminBotConfig,
    hidden,
    challengeId,
    totalSolves,
    isDisabled,
    formValid = $bindable(true),
    instancerValid = $bindable(true),
    actions,
    onShowPreview,
    onFilesChange,
    onInstancerConfigChange,
    onAdminBotConfigChange,
    onNameChange,
    onCategoryChange,
    onAuthorChange,
    onDescriptionChange,
    onFlagChange,
    onPointsMinChange,
    onPointsMaxChange,
    onTiebreakEligibleChange,
    onSortWeightChange,
    onHiddenChange,
    onReleaseTimeChange,
    releaseTime,
  }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  function timestampToDatetimeLocal(ts: number | null): string {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function datetimeLocalToTimestamp(value: string): number | null {
    if (!value) return null
    const ts = new Date(value).getTime()
    return isNaN(ts) ? null : ts
  }

  let tab = $state('details')
  let nameInputRef = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (!challengeId && nameInputRef) {
      nameInputRef.focus()
    }
  })

  let touched = $state({
    name: false,
    category: false,
    author: false,
    description: false,
    flag: false,
  })

  const errors = $derived({
    name: name.trim() === '' ? 'Name is required' : null,
    category: category.trim() === '' ? 'Category is required' : null,
    author: author.trim() === '' ? 'Author is required' : null,
    description: description.trim() === '' ? 'Description is required' : null,
    flag: flag.trim() === '' ? 'Flag is required' : null,
  })

  const isFormValid = $derived(
    !errors.name && !errors.category && !errors.author && !errors.description && !errors.flag
  )

  const detailsTabHasErrors = $derived(
    !!errors.name || !!errors.category || !!errors.author || !!errors.description || !!errors.flag
  )

  $effect(() => {
    formValid = isFormValid
  })

  const tabClassMobile =
    'rounded-lg px-3 py-2 text-sm bg-background-l2 data-[state=active]:bg-background-l4 data-[state=active]:shadow-none'
  const tabClassDesktop =
    'rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none'
</script>

<Tabs.Root bind:value={tab} class="@container/form flex h-full min-h-0 flex-col">
  <div class="px-5 pb-4 @lg/form:hidden">
    <Tabs.List class="grid h-auto w-full grid-cols-3 gap-1.5 rounded-none bg-transparent p-0">
      <Tabs.Trigger value="details" class={tabClassMobile}>
        <IconFileInfoFilled class="size-4" />
        Details
        {#if detailsTabHasErrors}
          <IconAlertCircleFilled class="text-foreground-destructive size-3.5" />
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="scoring" class={tabClassMobile}>
        <IconFlagFilled class="size-4" />
        Scoring
      </Tabs.Trigger>
      <Tabs.Trigger value="files" class={tabClassMobile}>
        <IconFileFilled class="size-4" />
        Files{files.length ? ` (${files.length})` : ''}
      </Tabs.Trigger>
      <Tabs.Trigger value="instancer" class={tabClassMobile}>
        <IconCloudComputingFilled class="size-4" />
        Instancer
        {#if !instancerValid}
          <IconAlertCircleFilled class="text-foreground-destructive size-3.5" />
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="adminbot" class={tabClassMobile}>
        <IconRobot class="size-4" />
        Admin bot
      </Tabs.Trigger>
      <Tabs.Trigger value="solves" class={tabClassMobile}>
        <IconTrophyFilled class="size-4" />
        Solves{totalSolves ? ` (${totalSolves})` : ''}
      </Tabs.Trigger>
    </Tabs.List>
  </div>

  <div class="scrollbar-none hidden overflow-x-auto px-5 @lg/form:block">
    <Tabs.List class="h-auto w-max gap-0 rounded-none bg-transparent p-0">
      <Tabs.Trigger value="details" class={tabClassDesktop}>
        <IconFileInfoFilled class="size-4" />
        Details
        {#if detailsTabHasErrors}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <IconAlertCircleFilled class="text-foreground-destructive size-4" />
            </Tooltip.Trigger>
            <Tooltip.Content>This tab has invalid fields</Tooltip.Content>
          </Tooltip.Root>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="scoring" class={tabClassDesktop}>
        <IconFlagFilled class="size-4" />
        Scoring
      </Tabs.Trigger>
      <Tabs.Trigger value="files" class={tabClassDesktop}>
        <IconFileFilled class="size-4" />
        Files{files.length ? ` (${files.length})` : ''}
      </Tabs.Trigger>
      <Tabs.Trigger value="instancer" class={tabClassDesktop}>
        <IconCloudComputingFilled class="size-4" />
        Instancer
        {#if !instancerValid}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <IconAlertCircleFilled class="text-foreground-destructive size-4" />
            </Tooltip.Trigger>
            <Tooltip.Content>This tab has invalid fields</Tooltip.Content>
          </Tooltip.Root>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="adminbot" class={tabClassDesktop}>
        <IconRobot class="size-4" />
        Admin bot
      </Tabs.Trigger>
      <Tabs.Trigger value="solves" class={tabClassDesktop}>
        <IconTrophyFilled class="size-4" />
        Solves{totalSolves ? ` (${totalSolves})` : ''}
      </Tabs.Trigger>
    </Tabs.List>
  </div>

  <div class="bg-background-l2 flex min-h-0 flex-1 flex-col">
    <Tabs.Content value="details" class="min-h-0 flex-1">
      <ScrollArea class="h-full px-4 pt-4 @lg/form:px-8" fadeSize={64} fadeColor="background-l2">
        <div class={cn('flex flex-col gap-4 p-1 pb-4', isDisabled && 'opacity-60')}>
          <div class="grid grid-cols-1 gap-4 @sm/form:grid-cols-2">
            <Field.Field data-invalid={touched.name && errors.name ? true : undefined}>
              <Field.Label
                >Name<span class="text-foreground-destructive -ms-1.5">*</span></Field.Label
              >
              <Input
                bind:ref={nameInputRef}
                type="text"
                placeholder="Challenge name"
                required
                value={name}
                oninput={e => onNameChange(e.currentTarget.value)}
                onblur={() => (touched.name = true)}
                aria-invalid={touched.name && !!errors.name}
                disabled={isDisabled}
              />
              {#if touched.name && errors.name}
                <Field.Error>{errors.name}</Field.Error>
              {/if}
            </Field.Field>
            <Field.Field data-invalid={touched.category && errors.category ? true : undefined}>
              <Field.Label
                >Category<span class="text-foreground-destructive -ms-1.5">*</span></Field.Label
              >
              <Input
                type="text"
                placeholder="web, pwn, crypto, etc."
                required
                value={category}
                oninput={e => onCategoryChange(e.currentTarget.value)}
                onblur={() => (touched.category = true)}
                aria-invalid={touched.category && !!errors.category}
                disabled={isDisabled}
              />
              {#if touched.category && errors.category}
                <Field.Error>{errors.category}</Field.Error>
              {/if}
            </Field.Field>
          </div>

          <Field.Field data-invalid={touched.author && errors.author ? true : undefined}>
            <Field.Label
              >Author<span class="text-foreground-destructive -ms-1.5">*</span></Field.Label
            >
            <Input
              type="text"
              placeholder="Challenge author"
              required
              value={author}
              oninput={e => onAuthorChange(e.currentTarget.value)}
              onblur={() => (touched.author = true)}
              aria-invalid={touched.author && !!errors.author}
              disabled={isDisabled}
            />
            {#if touched.author && errors.author}
              <Field.Error>{errors.author}</Field.Error>
            {/if}
          </Field.Field>

          <Field.Field data-invalid={touched.description && errors.description ? true : undefined}>
            <Field.Label class="flex items-center">
              Description<span class="text-foreground-destructive -ms-1.5">*</span>
              <Field.Hint>(Markdown supported)</Field.Hint>
              <Button
                variant="secondary"
                size="sm"
                class="ml-auto"
                onclick={onShowPreview}
                disabled={!description}
              >
                <IconEyeFilled class="size-4" />
                Preview
              </Button>
            </Field.Label>
            <Textarea
              placeholder="Challenge description (Markdown supported)"
              rows={12}
              required
              value={description}
              oninput={e => onDescriptionChange(e.currentTarget.value)}
              onblur={() => (touched.description = true)}
              aria-invalid={touched.description && !!errors.description}
              disabled={isDisabled}
            />
            {#if touched.description && errors.description}
              <Field.Error>{errors.description}</Field.Error>
            {/if}
          </Field.Field>

          <Field.Field data-invalid={touched.flag && errors.flag ? true : undefined}>
            <Field.Label>Flag<span class="text-foreground-destructive -ms-1.5">*</span></Field.Label
            >
            <Input
              type="text"
              placeholder={clientConfig?.flagFormatPlaceholder ?? 'flag{...}'}
              class="font-mono"
              required
              value={flag}
              oninput={e => onFlagChange(e.currentTarget.value)}
              onblur={() => (touched.flag = true)}
              aria-invalid={touched.flag && !!errors.flag}
              disabled={isDisabled}
            />
            {#if touched.flag && errors.flag}
              <Field.Error>{errors.flag}</Field.Error>
            {/if}
          </Field.Field>
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="scoring" class="min-h-0 flex-1">
      <ScrollArea class="h-full px-4 pt-4 @lg/form:px-8" fadeSize={64} fadeColor="background-l2">
        <div class={cn('flex flex-col gap-4 p-1 pb-4', isDisabled && 'opacity-60')}>
          <div class="grid grid-cols-1 gap-4 @sm/form:grid-cols-2">
            <Field.Field>
              <Field.Label>Minimum points <Field.Hint>(at max solves)</Field.Hint></Field.Label>
              <Input
                type="number"
                min={0}
                required
                value={pointsMin}
                onchange={e => onPointsMinChange(+e.currentTarget.value)}
                disabled={isDisabled}
              />
            </Field.Field>
            <Field.Field>
              <Field.Label>Maximum points <Field.Hint>(at zero solves)</Field.Hint></Field.Label>
              <Input
                type="number"
                min={0}
                required
                value={pointsMax}
                onchange={e => onPointsMaxChange(+e.currentTarget.value)}
                disabled={isDisabled}
              />
            </Field.Field>
          </div>

          <div class="grid grid-cols-1 gap-4 @sm/form:grid-cols-2">
            <Field.Field>
              <Field.Label>Sort weight <Field.Hint>(higher = first)</Field.Hint></Field.Label>
              <Input
                type="number"
                value={sortWeight}
                onchange={e => onSortWeightChange(+e.currentTarget.value)}
                disabled={isDisabled}
              />
            </Field.Field>
            <Field.Field>
              <Field.Label>Tiebreak eligibility</Field.Label>
              <Select.Root
                type="single"
                value={tiebreakEligible ? 'yes' : 'no'}
                onValueChange={v => onTiebreakEligibleChange(v === 'yes')}
                disabled={isDisabled}
              >
                <Select.Trigger class="w-full"
                  >{tiebreakEligible ? 'Eligible' : 'Ineligible'}</Select.Trigger
                >
                <Select.Content>
                  <Select.Item value="yes" label="Eligible">Eligible</Select.Item>
                  <Select.Item value="no" label="Ineligible">Ineligible</Select.Item>
                </Select.Content>
              </Select.Root>
            </Field.Field>
          </div>

          <Field.Field>
            <Field.Label>Visibility</Field.Label>
            <Select.Root
              type="single"
              value={hidden ? 'hidden' : 'visible'}
              onValueChange={v => onHiddenChange(v === 'hidden')}
              disabled={isDisabled}
            >
              <Select.Trigger class="w-full"
                >{hidden ? 'Hidden from players' : 'Visible to players'}</Select.Trigger
              >
              <Select.Content>
                <Select.Item value="visible" label="Visible">Visible to players</Select.Item>
                <Select.Item value="hidden" label="Hidden">Hidden from players</Select.Item>
              </Select.Content>
            </Select.Root>
          </Field.Field>

          <Field.Field>
            <Field.Label class="flex items-center">
              Release time
              {#if releaseTime}
                <button
                  type="button"
                  class="text-foreground-l3 hover:text-foreground-l1 ml-auto text-xs"
                  onclick={() => onReleaseTimeChange(null)}
                  disabled={isDisabled}
                >
                  Clear
                </button>
              {/if}
            </Field.Label>
            <Input
              type="datetime-local"
              value={timestampToDatetimeLocal(releaseTime)}
              onchange={e => onReleaseTimeChange(datetimeLocalToTimestamp(e.currentTarget.value))}
              disabled={isDisabled}
            />
          </Field.Field>
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="files" class="min-h-0 flex-1">
      <ScrollArea class="h-full px-4 pt-4 @lg/form:px-8" fadeSize={64} fadeColor="background-l2">
        <div class={cn('p-1 pb-4', isDisabled && 'opacity-60')}>
          <AdminChallengesDetailsAttachments {files} {isDisabled} {onFilesChange} />
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="instancer" class="min-h-0 flex-1">
      <ScrollArea class="h-full px-4 pt-4 @lg/form:px-5" fadeSize={64} fadeColor="background-l2">
        <div class={cn('pb-4', isDisabled && 'opacity-60')}>
          <AdminChallengesDetailsInstancer
            config={instancerConfig}
            {challengeId}
            {isDisabled}
            onConfigChange={onInstancerConfigChange}
            bind:isValid={instancerValid}
          />
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="adminbot" class="min-h-0 flex-1">
      <ScrollArea class="h-full px-4 pt-4 @lg/form:px-5" fadeSize={64} fadeColor="background-l2">
        <div class={cn('pb-4', isDisabled && 'opacity-60')}>
          <AdminChallengesDetailsAdminbot
            config={adminBotConfig}
            {isDisabled}
            onConfigChange={onAdminBotConfigChange}
          />
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="solves" class="min-h-0 flex-1">
      <AdminChallengesDetailsSolves {challengeId} {totalSolves} />
    </Tabs.Content>

    {#if actions}
      <div
        class="bg-background-l2 flex shrink-0 items-center justify-end gap-2 px-5 py-3 @lg/form:px-9 @xl/form:hidden"
      >
        {@render actions()}
      </div>
    {/if}
  </div>
</Tabs.Root>
