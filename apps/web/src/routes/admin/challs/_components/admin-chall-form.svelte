<script lang="ts">
  import { Button, Checkbox, Field, Input, Textarea } from '$lib/components'
  import { IconEyeFilled } from '$lib/icons'
  import Attachments from './admin-chall-attachments.svelte'

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
    files: { name: string; url: string }[]
    isDisabled: boolean
    onShowPreview: () => void
    onFilesChange: (files: { name: string; url: string }[]) => void
  }

  let {
    name = $bindable(),
    category = $bindable(),
    author = $bindable(),
    description = $bindable(),
    flag = $bindable(),
    pointsMin = $bindable(),
    pointsMax = $bindable(),
    tiebreakEligible = $bindable(),
    sortWeight = $bindable(),
    files = $bindable(),
    isDisabled,
    onShowPreview,
    onFilesChange,
  }: Props = $props()
</script>

<div class="flex flex-col gap-6">
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
            bind:value={name}
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
            bind:value={category}
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
          bind:value={author}
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
          bind:value={description}
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

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            bind:value={flag}
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
              bind:value={pointsMin}
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
              bind:value={pointsMax}
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
              bind:value={sortWeight}
              disabled={isDisabled}
            />
            <Field.Description>Higher = first</Field.Description>
          </Field.Field>

          <div class="flex items-center gap-2 pt-6">
            <Checkbox
              id="tiebreakEligible"
              bind:checked={tiebreakEligible}
              disabled={isDisabled}
            />
            <label for="tiebreakEligible" class="text-sm"
              >Tiebreak eligible</label
            >
          </div>
        </div>
      </div>
    </div>

    <Attachments {files} {isDisabled} {onFilesChange} />
  </div>
</div>
