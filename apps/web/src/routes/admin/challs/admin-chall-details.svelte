<script lang="ts">
  import {
    GoodChallengeDelete,
    GoodChallengeUpdate,
    GoodFilesUpload,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { AdminChallenge, AdminChallengeDetail } from '$lib/api'
  import {
    Button,
    Checkbox,
    Dialog,
    EmptyState,
    Field,
    Input,
    Markdown,
    ScrollArea,
    Spinner,
    Textarea,
  } from '$lib/components'
  import {
    IconAlertTriangleFilled,
    IconEyeFilled,
    IconFileUploadFilled,
    IconHammer,
    IconPencilFilled,
    IconTrashFilled,
    IconX,
  } from '$lib/icons'
  import {
    queryKeys,
    useAdminChallenge,
    useCurrentUser,
    useDeleteChallengeMutation,
    useUpdateChallengeMutation,
    useUploadFilesMutation,
  } from '$lib/query'
  import { cn, getCategoryConfig, getCategoryStyle } from '$lib/utils'

  interface Props {
    challenge: AdminChallenge | null
    isCreatingNew: boolean
    onSaved: (challenge: AdminChallenge) => void
    onDeleted: () => void
    onCancelNew: () => void
    onCheckUnsaved?: () => boolean
  }

  let { challenge, isCreatingNew, onSaved, onDeleted, onCancelNew }: Props =
    $props()

  let showUnsavedDialog = $state(false)
  let showPreviewDialog = $state(false)
  let showDeleteDialog = $state(false)
  let pendingAction = $state<(() => void) | null>(null)

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const updateMutation = useUpdateChallengeMutation()
  const deleteMutation = useDeleteChallengeMutation()
  const uploadMutation = useUploadFilesMutation()

  const user = $derived($userQuery.data)
  const hasWritePerms = $derived(
    user?.perms !== null &&
      user?.perms !== undefined &&
      (user.perms & Permissions.challsWrite) !== 0
  )

  let currentChallengeId = $state<string | null>(null)
  let challengeDetailQuery = $state(useAdminChallenge('', false))

  $effect(() => {
    if (challenge?.id && challenge.id !== currentChallengeId) {
      currentChallengeId = challenge.id
      challengeDetailQuery = useAdminChallenge(challenge.id, true)
    } else if (!challenge?.id) {
      currentChallengeId = null
    }
  })

  const challengeDetail = $derived($challengeDetailQuery.data)

  let isEditMode = $state(false)

  let name = $state('')
  let category = $state('')
  let author = $state('')
  let description = $state('')
  let flag = $state('')
  let pointsMin = $state(100)
  let pointsMax = $state(500)
  let tiebreakEligible = $state(true)
  let sortWeight = $state(0)
  let files = $state<{ name: string; url: string }[]>([])

  const isDisabled = $derived(!isEditMode && !isCreatingNew)
  const categoryConfig = $derived(getCategoryConfig(category || 'misc'))
  const categoryStyle = $derived(getCategoryStyle(categoryConfig.color))

  const hasUnsavedChanges = $derived.by(() => {
    if (!isEditMode && !isCreatingNew) return false

    if (isCreatingNew) {
      return !!(
        name ||
        category ||
        author ||
        description ||
        flag ||
        files.length > 0
      )
    }

    if (!challengeDetail) return false

    return (
      name !== challengeDetail.name ||
      category !== challengeDetail.category ||
      author !== challengeDetail.author ||
      description !== challengeDetail.description ||
      flag !== challengeDetail.flag ||
      pointsMin !== challengeDetail.points.min ||
      pointsMax !== challengeDetail.points.max ||
      tiebreakEligible !== challengeDetail.tiebreakEligible ||
      sortWeight !== (challengeDetail.sortWeight ?? 0) ||
      JSON.stringify(files) !== JSON.stringify(challengeDetail.files)
    )
  })

  export function checkUnsavedChanges(action: () => void): boolean {
    if (hasUnsavedChanges) {
      pendingAction = action
      showUnsavedDialog = true
      return true
    }
    return false
  }

  function handleDiscardChanges() {
    showUnsavedDialog = false
    isEditMode = false
    if (pendingAction) {
      pendingAction()
      pendingAction = null
    }
  }

  function handleCancelDiscard() {
    showUnsavedDialog = false
    pendingAction = null
  }

  function resetForm(detail: AdminChallengeDetail | null) {
    name = detail?.name ?? ''
    category = detail?.category ?? ''
    author = detail?.author ?? ''
    description = detail?.description ?? ''
    flag = detail?.flag ?? ''
    pointsMin = detail?.points.min ?? 100
    pointsMax = detail?.points.max ?? 500
    tiebreakEligible = detail?.tiebreakEligible ?? true
    sortWeight = detail?.sortWeight ?? 0
    files = detail?.files ? [...detail.files] : []
  }

  $effect(() => {
    if (isCreatingNew) {
      resetForm(null)
      isEditMode = true
    }
  })

  $effect(() => {
    if (challenge && !isCreatingNew) {
      name = challenge.name
      category = challenge.category
      author = challenge.author
      pointsMin = challenge.points.min
      pointsMax = challenge.points.max
      files = challenge.files ? [...challenge.files] : []
      tiebreakEligible = challenge.tiebreakEligible
      sortWeight = challenge.sortWeight ?? 0
      description = ''
      flag = ''
      isEditMode = false
    }
  })

  $effect(() => {
    if (
      challengeDetail &&
      !isCreatingNew &&
      challenge?.id === challengeDetail.id
    ) {
      resetForm(challengeDetail)
      isEditMode = false
    }
  })

  function handleEnterEditMode() {
    if (!hasWritePerms) return
    isEditMode = true
  }

  function handleCancelEdit() {
    if (isCreatingNew) {
      resetForm(null)
      isEditMode = false
      onCancelNew()
    } else {
      resetForm(challengeDetail ?? null)
      isEditMode = false
    }
  }

  async function handleSave() {
    if (!hasWritePerms) {
      toast.error('You do not have permission to edit challenges')
      return
    }

    const id = isCreatingNew ? crypto.randomUUID() : challenge!.id

    $updateMutation.mutate(
      {
        id,
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
      },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeUpdate.kind) {
            toast.success(
              isCreatingNew ? 'Challenge created!' : 'Challenge saved!'
            )
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminChallenges,
            })
            if (challenge?.id) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.adminChallenge(challenge.id),
              })
            }
            isEditMode = false
            onSaved({
              id,
              name,
              category,
              author,
              description,
              flag,
              points: { min: pointsMin, max: pointsMax },
              files,
              tiebreakEligible,
              sortWeight,
            })
          } else {
            toast.error(response.message)
          }
        },
        onError: error => {
          toast.error(error.message)
        },
      }
    )
  }

  function handleDeleteClick() {
    if (!hasWritePerms || !challenge) return
    showDeleteDialog = true
  }

  function handleDeleteConfirm() {
    if (!challenge) return
    showDeleteDialog = false

    $deleteMutation.mutate(
      { id: challenge.id },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeDelete.kind) {
            toast.success('Challenge deleted!')
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminChallenges,
            })
            onDeleted()
          } else {
            toast.error(response.message)
          }
        },
        onError: error => {
          toast.error(error.message)
        },
      }
    )
  }

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return

    const filesToUpload: { name: string; data: string }[] = []

    for (const file of input.files) {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>(resolve => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      filesToUpload.push({ name: file.name, data: dataUrl })
    }

    $uploadMutation.mutate(
      { files: filesToUpload },
      {
        onSuccess: response => {
          if (response.kind === GoodFilesUpload.kind) {
            files = [...files, ...response.data]
            toast.success(`${response.data.length} file(s) uploaded!`)
          } else {
            toast.error(response.message)
          }
        },
        onError: error => {
          toast.error(error.message)
        },
      }
    )

    input.value = ''
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index)
  }
</script>

{#if challenge || isCreatingNew}
  {#key challenge?.id ?? 'new'}
    <div class="flex h-full flex-col">
      <div class="flex flex-col py-6">
        <div class="px-9 flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-2xl">
              {isCreatingNew ? 'New Challenge' : name || 'Untitled'}
            </h2>
            <div class="flex items-center gap-2 text-foreground-l3 text-base">
              <span>by {author || 'Unknown'}</span>
              <span class="text-foreground-l5 opacity-50 text-2xl leading-none"
                >·</span
              >
              <div class="flex gap-1">
                {#if category}
                  <span
                    class="inline-flex items-center gap-1 rounded-lg bg-category-background-l0 text-category-foreground-l1 px-3 py-0.5 text-sm"
                    style={categoryStyle}
                  >
                    <categoryConfig.icon class="size-3.5" />
                    {categoryConfig.name}
                  </span>
                {:else}
                  <span
                    class="rounded-lg bg-background-l2 text-foreground-l4 px-3 py-0.5 text-sm"
                  >
                    No category
                  </span>
                {/if}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <h2 class="text-right text-2xl tabular-nums">
              {pointsMin}–{pointsMax} pts
            </h2>
            {#if !isCreatingNew && challenge}
              <p class="text-right text-foreground-l5 text-base font-mono">
                {challenge.id}
              </p>
            {/if}
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 bg-background-l1">
        <ScrollArea class="h-full px-5" fadeSize={64} fadeColor="background-l1">
          <div
            class={cn(
              'flex flex-col gap-6',
              isDisabled && 'opacity-50 pointer-events-none'
            )}
          >
            <div
              class="overflow-hidden rounded-lg border-2 border-border bg-background-l2"
            >
              <div
                class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3"
              >
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
                      onclick={() => (showPreviewDialog = true)}
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
                <div
                  class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3"
                >
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

              <div
                class="overflow-hidden rounded-lg border-2 border-border bg-background-l2 flex flex-col"
              >
                <div
                  class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3 flex items-center justify-between"
                >
                  <span>Attachments</span>
                  <span class="text-base text-foreground-l5"
                    >{files.length} file{files.length === 1 ? '' : 's'}</span
                  >
                </div>
                <div class="p-4 flex flex-col gap-4 flex-1">
                  {#if files.length > 0}
                    <ul class="flex flex-col gap-2">
                      {#each files as file, index (file.url)}
                        <li
                          class="flex items-center justify-between gap-2 rounded-md bg-background-l4 p-3"
                        >
                          <div class="flex flex-col gap-1 overflow-hidden">
                            <span class="truncate font-medium">{file.name}</span
                            >
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-foreground-l3 truncate text-sm hover:underline"
                            >
                              {file.url}
                            </a>
                          </div>
                          {#if !isDisabled}
                            <Button
                              type="button"
                              variant="destructive"
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

                  {#if !isDisabled}
                    <div class="flex items-center gap-2 mt-auto">
                      <input
                        type="file"
                        id="fileUpload"
                        multiple
                        onchange={handleFileUpload}
                        disabled={$uploadMutation.isPending}
                        class="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onclick={() =>
                          document.getElementById('fileUpload')?.click()}
                        disabled={$uploadMutation.isPending}
                      >
                        {#if $uploadMutation.isPending}
                          <Spinner class="size-4" />
                        {:else}
                          <IconFileUploadFilled class="size-4" />
                        {/if}
                        Upload files
                      </Button>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div
        class="flex items-center justify-between gap-4 bg-background-l1 px-5 py-4"
      >
        {#if isEditMode || isCreatingNew}
          <div class="flex items-center gap-3">
            {#if !isCreatingNew && challenge}
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onclick={handleDeleteClick}
                disabled={$deleteMutation.isPending}
              >
                {#if $deleteMutation.isPending}
                  <Spinner class="size-5" />
                {:else}
                  <IconTrashFilled class="size-5" />
                {/if}
                Delete challenge
              </Button>
            {/if}
          </div>
          <div class="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onclick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              onclick={handleSave}
              disabled={$updateMutation.isPending}
            >
              {#if $updateMutation.isPending}
                <Spinner class="size-5" />
              {/if}
              {isCreatingNew ? 'Create challenge' : 'Save changes'}
            </Button>
          </div>
        {:else if hasWritePerms}
          <div></div>
          <Button type="button" size="lg" onclick={handleEnterEditMode}>
            <IconPencilFilled class="size-5" />
            Edit challenge
          </Button>
        {/if}
      </div>
    </div>
  {/key}
{:else}
  <EmptyState
    icon={IconHammer}
    title="Select a challenge"
    subtitle="Choose a challenge from the list or create a new one"
    class="h-full"
  />
{/if}

<Dialog.Root bind:open={showUnsavedDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <IconAlertTriangleFilled class="size-5 text-foreground-warning" />
        Unsaved changes
      </Dialog.Title>
      <Dialog.Description>
        You have unsaved changes that will be lost. Are you sure you want to
        leave?
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button variant="ghost" onclick={handleCancelDiscard}>
        Keep editing
      </Button>
      <Button variant="destructive" onclick={handleDiscardChanges}>
        Discard changes
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showPreviewDialog}>
  <Dialog.Content class="sm:max-w-2xl max-h-[80vh] flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Description preview</Dialog.Title>
      <Dialog.Description>
        This is how the description will appear to players.
      </Dialog.Description>
    </Dialog.Header>
    <ScrollArea class="flex-1 min-h-0 -mx-6 px-6">
      <div class="py-4">
        {#if description}
          <div class="rounded-lg border-2 p-4 bg-background-l2">
            <Markdown content={description} class="prose-sm max-w-none" />
          </div>
        {:else}
          <p class="text-foreground-l3 text-center py-8">
            No description to preview.
          </p>
        {/if}
      </div>
    </ScrollArea>
    <Dialog.Footer>
      <Button onclick={() => (showPreviewDialog = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <IconTrashFilled class="size-5 text-foreground-destructive" />
        Delete challenge
      </Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete "{name || 'this challenge'}"? This
        action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button variant="ghost" onclick={() => (showDeleteDialog = false)}>
        Cancel
      </Button>
      <Button variant="destructive" onclick={handleDeleteConfirm}>
        {#if $deleteMutation.isPending}
          <Spinner class="size-4" />
        {/if}
        Delete challenge
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
