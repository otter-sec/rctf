<script lang="ts">
  import type { InstancerConfig } from '$lib/api'
  import {
    Button,
    Field,
    Input,
    ScrollArea,
    Select,
    Tabs,
    Textarea,
  } from '$lib/components'
  import {
    IconCloudComputingFilled,
    IconEyeFilled,
    IconFileFilled,
    IconFileInfoFilled,
    IconFlagFilled,
  } from '$lib/icons'
  import Attachments from './attachments.svelte'
  import InstancerConfigComponent from './instancer-config.svelte'

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
    isDisabled: boolean
    onShowPreview: () => void
    onFilesChange: (
      files: { name: string; url: string; size: number | null }[]
    ) => void
    onInstancerConfigChange: (config: InstancerConfig | null) => void
    onNameChange: (value: string) => void
    onCategoryChange: (value: string) => void
    onAuthorChange: (value: string) => void
    onDescriptionChange: (value: string) => void
    onFlagChange: (value: string) => void
    onPointsMinChange: (value: number) => void
    onPointsMaxChange: (value: number) => void
    onTiebreakEligibleChange: (value: boolean) => void
    onSortWeightChange: (value: number) => void
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
    isDisabled,
    onShowPreview,
    onFilesChange,
    onInstancerConfigChange,
    onNameChange,
    onCategoryChange,
    onAuthorChange,
    onDescriptionChange,
    onFlagChange,
    onPointsMinChange,
    onPointsMaxChange,
    onTiebreakEligibleChange,
    onSortWeightChange,
  }: Props = $props()

  let activeTab = $state('details')
</script>

<Tabs.Root bind:value={activeTab} class="flex h-full min-h-0 flex-col">
  <div class="px-5">
    <Tabs.List class="h-auto w-fit gap-0 rounded-none bg-transparent p-0">
      <Tabs.Trigger
        value="details"
        class="rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none"
      >
        <IconFileInfoFilled class="size-4" />
        Details
      </Tabs.Trigger>
      <Tabs.Trigger
        value="scoring"
        class="rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none"
      >
        <IconFlagFilled class="size-4" />
        Scoring
      </Tabs.Trigger>
      <Tabs.Trigger
        value="files"
        class="rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none"
      >
        <IconFileFilled class="size-4" />
        Files{files.length > 0 ? ` (${files.length})` : ''}
      </Tabs.Trigger>
      <Tabs.Trigger
        value="instancer"
        class="rounded-t-lg rounded-b-none px-4 py-1 data-[state=active]:bg-background-l2 data-[state=active]:shadow-none"
      >
        <IconCloudComputingFilled class="size-4" />
        Instancer
      </Tabs.Trigger>
    </Tabs.List>
  </div>

  <div class="min-h-0 flex-1 bg-background-l2">
    <Tabs.Content value="details" class="h-full">
      <ScrollArea
        class="h-full px-9 pt-4"
        fadeSize={64}
        fadeColor="background-l2"
      >
        <div class="flex flex-col gap-4 pb-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field.Field>
              <Field.Label for="name">Name</Field.Label>
              <Input
                id="name"
                type="text"
                placeholder="Challenge name"
                required
                value={name}
                oninput={e => onNameChange(e.currentTarget.value)}
                disabled={isDisabled}
              />
            </Field.Field>

            <Field.Field>
              <Field.Label for="category">Category</Field.Label>
              <Input
                id="category"
                type="text"
                placeholder="web, pwn, crypto, etc."
                required
                value={category}
                oninput={e => onCategoryChange(e.currentTarget.value)}
                disabled={isDisabled}
              />
            </Field.Field>
          </div>

          <Field.Field>
            <Field.Label for="author">Author</Field.Label>
            <Input
              id="author"
              type="text"
              placeholder="Challenge author"
              required
              value={author}
              oninput={e => onAuthorChange(e.currentTarget.value)}
              disabled={isDisabled}
            />
          </Field.Field>

          <Field.Field>
            <Field.Label for="description" class="flex items-center"
              >Description <Field.Hint>(Markdown supported)</Field.Hint>

              <Button
                type="button"
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
              id="description"
              placeholder="Challenge description (Markdown supported)"
              rows={12}
              required
              value={description}
              oninput={e => onDescriptionChange(e.currentTarget.value)}
              disabled={isDisabled}
            />
          </Field.Field>
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="scoring" class="h-full">
      <ScrollArea
        class="h-full px-9 pt-4"
        fadeSize={64}
        fadeColor="background-l2"
      >
        <div class="flex flex-col gap-4 pb-4">
          <Field.Field>
            <Field.Label for="flag">Flag</Field.Label>
            <Input
              id="flag"
              type="text"
              placeholder={'flag{...}'}
              class="font-mono"
              required
              value={flag}
              oninput={e => onFlagChange(e.currentTarget.value)}
              disabled={isDisabled}
            />
          </Field.Field>

          <div class="grid grid-cols-2 gap-4">
            <Field.Field>
              <Field.Label for="pointsMin"
                >Minimum points <Field.Hint>(at max solves)</Field.Hint
                ></Field.Label
              >
              <Input
                id="pointsMin"
                type="number"
                min={0}
                required
                value={pointsMin}
                oninput={e => onPointsMinChange(Number(e.currentTarget.value))}
                disabled={isDisabled}
              />
            </Field.Field>

            <Field.Field>
              <Field.Label for="pointsMax"
                >Maximum points <Field.Hint>(at zero solves)</Field.Hint
                ></Field.Label
              >
              <Input
                id="pointsMax"
                type="number"
                min={0}
                required
                value={pointsMax}
                oninput={e => onPointsMaxChange(Number(e.currentTarget.value))}
                disabled={isDisabled}
              />
            </Field.Field>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <Field.Field>
              <Field.Label for="sortWeight"
                >Sort weight <Field.Hint>(higher = first)</Field.Hint
                ></Field.Label
              >
              <Input
                id="sortWeight"
                type="number"
                value={sortWeight}
                oninput={e => onSortWeightChange(Number(e.currentTarget.value))}
                disabled={isDisabled}
              />
            </Field.Field>

            <Field.Field>
              <Field.Label for="tiebreakEligible"
                >Tiebreak eligibility</Field.Label
              >
              <Select.Root
                type="single"
                value={tiebreakEligible ? 'yes' : 'no'}
                onValueChange={v => onTiebreakEligibleChange(v === 'yes')}
                disabled={isDisabled}
              >
                <Select.Trigger id="tiebreakEligible" class="w-full">
                  {tiebreakEligible ? 'Eligible' : 'Ineligible'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="yes" label="Eligible"
                    >Eligible</Select.Item
                  >
                  <Select.Item value="no" label="Ineligible"
                    >Ineligible</Select.Item
                  >
                </Select.Content>
              </Select.Root>
            </Field.Field>
          </div>
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="files" class="h-full">
      <ScrollArea
        class="h-full px-9 pt-4"
        fadeSize={64}
        fadeColor="background-l2"
      >
        <div class="pb-4">
          <Attachments {files} {isDisabled} {onFilesChange} />
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="instancer" class="h-full">
      <ScrollArea
        class="h-full px-5 pt-4"
        fadeSize={64}
        fadeColor="background-l2"
      >
        <div class="pb-4">
          <InstancerConfigComponent
            config={instancerConfig}
            {isDisabled}
            onConfigChange={onInstancerConfigChange}
          />
        </div>
      </ScrollArea>
    </Tabs.Content>
  </div>
</Tabs.Root>
