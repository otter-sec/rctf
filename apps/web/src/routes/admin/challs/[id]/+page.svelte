<script lang="ts">
  import { IconArrowLeft, IconTrash, IconUpload, IconX } from '$lib/icons'
  import {
    DeleteChallengeRoute,
    GoodChallengeDelete,
    GoodChallengeUpdate,
    GoodFilesUpload,
    Permissions,
    UpdateChallengeRoute,
    UploadFilesRoute,
  } from '@rctf/types'
  import { goto } from '$app/navigation'
  import { apiRequest, toast, type AdminChallengeDetail } from '$lib'
  import {
    Badge,
    Button,
    Card,
    Checkbox,
    Field,
    Input,
    Label,
    Spinner,
    Textarea,
  } from '$lib/components'

  let { data } = $props()

  const hasWritePerms = $derived(
    data.user?.perms !== null &&
      data.user?.perms !== undefined &&
      (data.user.perms & Permissions.challsWrite) !== 0
  )

  let name = $state(data.challenge?.name ?? '')
  let category = $state(data.challenge?.category ?? '')
  let author = $state(data.challenge?.author ?? '')
  let description = $state(data.challenge?.description ?? '')
  let flag = $state(data.challenge?.flag ?? '')
  let pointsMin = $state(data.challenge?.points.min ?? 100)
  let pointsMax = $state(data.challenge?.points.max ?? 500)
  let tiebreakEligible = $state(data.challenge?.tiebreakEligible ?? true)
  let sortWeight = $state(data.challenge?.sortWeight ?? 0)
  let files = $state<{ name: string; url: string }[]>(
    data.challenge?.files ?? []
  )

  let loading = $state(false)
  let deleting = $state(false)
  let uploading = $state(false)
  let errors = $state<Record<string, string>>({})

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    if (!hasWritePerms) {
      toast.error('You do not have permission to edit challenges')
      return
    }

    loading = true
    errors = {}

    const challengeId = data.isNew ? crypto.randomUUID() : data.challenge!.id

    const response = await apiRequest(UpdateChallengeRoute, {
      id: challengeId,
      data: {
        name,
        category,
        author,
        description,
        flag,
        points: { min: pointsMin, max: pointsMax },
        tiebreakEligible,
        sortWeight: sortWeight || undefined,
        files,
      },
    })

    if (response.kind === GoodChallengeUpdate.kind) {
      toast.success(data.isNew ? 'Challenge created!' : 'Challenge updated!')
      if (data.isNew) {
        goto(`/admin/challs/${challengeId}`)
      }
    } else {
      errors = { form: response.message }
      toast.error(response.message)
    }

    loading = false
  }

  async function handleDelete() {
    if (!hasWritePerms || !data.challenge) return

    if (!confirm('Are you sure you want to delete this challenge?')) {
      return
    }

    deleting = true

    const response = await apiRequest(DeleteChallengeRoute, {
      id: data.challenge.id,
    })

    if (response.kind === GoodChallengeDelete.kind) {
      toast.success('Challenge deleted!')
      goto('/admin/challs')
    } else {
      toast.error(response.message)
    }

    deleting = false
  }

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return

    uploading = true

    const filesToUpload: { name: string; data: string }[] = []

    for (const file of input.files) {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>(resolve => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      filesToUpload.push({ name: file.name, data: dataUrl })
    }

    const response = await apiRequest(UploadFilesRoute, {
      files: filesToUpload,
    })

    if (response.kind === GoodFilesUpload.kind) {
      files = [...files, ...response.data]
      toast.success(`${response.data.length} file(s) uploaded!`)
    } else {
      toast.error(response.message)
    }

    input.value = ''
    uploading = false
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index)
  }
</script>

<svelte:head>
  <title>
    {data.isNew ? 'New challenge' : (data.challenge?.name ?? 'Challenge')} | Admin
    | {data.clientConfig.ctfName}
  </title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="icon" href="/admin/challs">
      <IconArrowLeft class="size-4" />
    </Button>
    <div>
      <h1 class="text-2xl font-medium">
        {data.isNew ? 'New challenge' : 'Edit challenge'}
      </h1>
      {#if !data.isNew && data.challenge}
        <p class="text-foreground-l3 text-sm">{data.challenge.id}</p>
      {/if}
    </div>
  </div>

  {#if data.error}
    <Card.Root>
      <Card.Content>
        <div
          class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
          role="alert"
        >
          {data.error}
        </div>
        <Button href="/admin/challs" class="mt-4">Back to challenges</Button>
      </Card.Content>
    </Card.Root>
  {:else}
    <form onsubmit={handleSubmit} class="flex flex-col gap-6">
      {#if errors.form}
        <div
          class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
          role="alert"
        >
          {errors.form}
        </div>
      {/if}

      <Card.Root>
        <Card.Header>
          <Card.Title>Basic info</Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field.Field>
              <Field.Label for="name">Name</Field.Label>
              <Input
                id="name"
                type="text"
                placeholder="Challenge name"
                required
                bind:value={name}
                disabled={!hasWritePerms}
              />
            </Field.Field>

            <Field.Field>
              <Field.Label for="category">Category</Field.Label>
              <Input
                id="category"
                type="text"
                placeholder="web, pwn, crypto, etc."
                required
                bind:value={category}
                disabled={!hasWritePerms}
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
              bind:value={author}
              disabled={!hasWritePerms}
            />
          </Field.Field>

          <Field.Field>
            <Field.Label for="description">Description</Field.Label>
            <Textarea
              id="description"
              placeholder="Challenge description (Markdown supported)"
              rows={6}
              required
              bind:value={description}
              disabled={!hasWritePerms}
            />
            <Field.Description
              >Markdown formatting is supported.</Field.Description
            >
          </Field.Field>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Flag and scoring</Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-4">
          <Field.Field>
            <Field.Label for="flag">Flag</Field.Label>
            <Input
              id="flag"
              type="text"
              placeholder={'flag{...}'}
              class="font-mono"
              required
              bind:value={flag}
              disabled={!hasWritePerms}
            />
          </Field.Field>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field.Field>
              <Field.Label for="pointsMin">Minimum points</Field.Label>
              <Input
                id="pointsMin"
                type="number"
                min={0}
                required
                bind:value={pointsMin}
                disabled={!hasWritePerms}
              />
              <Field.Description>Points at maximum solves</Field.Description>
            </Field.Field>

            <Field.Field>
              <Field.Label for="pointsMax">Maximum points</Field.Label>
              <Input
                id="pointsMax"
                type="number"
                min={0}
                required
                bind:value={pointsMax}
                disabled={!hasWritePerms}
              />
              <Field.Description>Points at zero solves</Field.Description>
            </Field.Field>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field.Field>
              <Field.Label for="sortWeight">Sort weight</Field.Label>
              <Input
                id="sortWeight"
                type="number"
                bind:value={sortWeight}
                disabled={!hasWritePerms}
              />
              <Field.Description>Higher numbers appear first</Field.Description>
            </Field.Field>

            <div class="flex items-center gap-2 pt-6">
              <Checkbox
                id="tiebreakEligible"
                bind:checked={tiebreakEligible}
                disabled={!hasWritePerms}
              />
              <Label for="tiebreakEligible">Tiebreak eligible</Label>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>
            Files
            <Badge variant="secondary" class="ml-2">{files.length}</Badge>
          </Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-4">
          {#if files.length > 0}
            <ul class="flex flex-col gap-2">
              {#each files as file, index (file.url)}
                <li
                  class="flex items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div class="flex flex-col gap-1 overflow-hidden">
                    <span class="truncate font-medium">{file.name}</span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-foreground-l3 truncate text-sm hover:underline"
                    >
                      {file.url}
                    </a>
                  </div>
                  {#if hasWritePerms}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onclick={() => removeFile(index)}
                    >
                      <IconX class="size-4" />
                    </Button>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-foreground-l3 text-sm">No files attached.</p>
          {/if}

          {#if hasWritePerms}
            <div class="flex items-center gap-2">
              <input
                type="file"
                id="fileUpload"
                multiple
                onchange={handleFileUpload}
                disabled={uploading}
                class="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onclick={() => document.getElementById('fileUpload')?.click()}
                disabled={uploading}
              >
                {#if uploading}
                  <Spinner class="size-4" />
                {:else}
                  <IconUpload class="size-4" />
                {/if}
                Upload files
              </Button>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      {#if hasWritePerms}
        <div class="flex items-center justify-between">
          <div>
            {#if !data.isNew && data.challenge}
              <Button
                type="button"
                variant="destructive"
                onclick={handleDelete}
                disabled={deleting}
              >
                {#if deleting}
                  <Spinner class="size-4" />
                {:else}
                  <IconTrash class="size-4" />
                {/if}
                Delete challenge
              </Button>
            {/if}
          </div>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <Spinner class="size-4" />
            {/if}
            {data.isNew ? 'Create challenge' : 'Save changes'}
          </Button>
        </div>
      {/if}
    </form>
  {/if}
</div>
