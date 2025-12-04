<script lang="ts">
  import { Button, Field, Input, Select, Textarea } from '$lib/components'
  import { IconEyeFilled } from '$lib/icons'
  import Attachments from './attachments.svelte'

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
    isDisabled: boolean
    onShowPreview: () => void
    onFilesChange: (
      files: { name: string; url: string; size: number | null }[]
    ) => void
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
    isDisabled,
    onShowPreview,
    onFilesChange,
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
</script>

<div class="flex flex-col gap-4">
  <div
    class="overflow-hidden rounded-lg border-2 border-border bg-background-l2"
  >
    <div class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3">
      Basic information
    </div>
    <div class="px-4 pt-2 pb-4 flex flex-col gap-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field.Field>
          <Field.Label for="name">Name</Field.Label>
          <Input
            id="name"
            type="text"
            placeholder="Challenge name"
            class="bg-background-l4"
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
            class="bg-background-l4"
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
          class="bg-background-l4"
          required
          value={author}
          oninput={e => onAuthorChange(e.currentTarget.value)}
          disabled={isDisabled}
        />
      </Field.Field>

      <Field.Field>
        <Field.Label for="description">Description</Field.Label>
        <Textarea
          id="description"
          placeholder="Challenge description (Markdown supported)"
          class="bg-background-l4"
          rows={8}
          required
          value={description}
          oninput={e => onDescriptionChange(e.currentTarget.value)}
          disabled={isDisabled}
        />
        <div class="flex items-center justify-between">
          <Field.Description
            >Markdown formatting is supported.</Field.Description
          >
          <Button
            type="button"
            size="sm"
            onclick={onShowPreview}
            disabled={!description}
          >
            <IconEyeFilled class="size-4" />
            Preview
          </Button>
        </div>
      </Field.Field>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div
      class="overflow-hidden rounded-lg border-2 border-border bg-background-l2"
    >
      <div class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3">
        Flag and scoring
      </div>
      <div class="px-4 pt-2 pb-4 flex flex-col gap-4">
        <Field.Field>
          <Field.Label for="flag">Flag</Field.Label>
          <Input
            id="flag"
            type="text"
            placeholder={'flag{...}'}
            class="font-mono bg-background-l4"
            required
            value={flag}
            oninput={e => onFlagChange(e.currentTarget.value)}
            disabled={isDisabled}
          />
        </Field.Field>

        <div class="grid grid-cols-2 gap-4">
          <Field.Field>
            <Field.Label for="pointsMin">Min points</Field.Label>
            <Input
              id="pointsMin"
              type="number"
              class="bg-background-l4"
              min={0}
              required
              value={pointsMin}
              oninput={e => onPointsMinChange(Number(e.currentTarget.value))}
              disabled={isDisabled}
            />
            <Field.Description>At max solves</Field.Description>
          </Field.Field>

          <Field.Field>
            <Field.Label for="pointsMax">Max points</Field.Label>
            <Input
              id="pointsMax"
              type="number"
              class="bg-background-l4"
              min={0}
              required
              value={pointsMax}
              oninput={e => onPointsMaxChange(Number(e.currentTarget.value))}
              disabled={isDisabled}
            />
            <Field.Description>At zero solves</Field.Description>
          </Field.Field>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <Field.Field>
            <Field.Label for="sortWeight">Sort weight</Field.Label>
            <Input
              id="sortWeight"
              type="number"
              class="bg-background-l4"
              value={sortWeight}
              oninput={e => onSortWeightChange(Number(e.currentTarget.value))}
              disabled={isDisabled}
            />
            <Field.Description>Higher = first</Field.Description>
          </Field.Field>

          <Field.Field>
            <Field.Label for="tiebreakEligible">Tiebreak eligibility</Field.Label>
            <Select.Root
              type="single"
              value={tiebreakEligible ? 'yes' : 'no'}
              onValueChange={v => onTiebreakEligibleChange(v === 'yes')}
              disabled={isDisabled}
            >
              <Select.Trigger id="tiebreakEligible" class="w-full bg-background-l4">
                {tiebreakEligible ? 'Eligible' : 'Ineligible'}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="yes" label="Eligible">Eligible</Select.Item>
                <Select.Item value="no" label="Ineligible">Ineligible</Select.Item>
              </Select.Content>
            </Select.Root>
          </Field.Field>
        </div>
      </div>
    </div>

    <Attachments {files} {isDisabled} {onFilesChange} />
  </div>
</div>
