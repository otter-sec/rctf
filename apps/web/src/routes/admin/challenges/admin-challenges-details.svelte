<script lang="ts">
  import {
    BadInstancerConfig,
    GoodChallengeDelete,
    GoodChallengeUpdateV2,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError, toast } from '$lib'
  import { Button, EmptyState, Spinner, Tooltip } from '$lib/components'
  import { IconHammer, IconPencilFilled, IconTrashFilled } from '$lib/icons'
  import { type editorMachine, type FormData } from '$lib/machines'
  import {
    queryKeys,
    useAdminChallenge,
    useCurrentUser,
    useDeleteChallengeMutation,
    useUpdateChallengeMutation,
  } from '$lib/query'
  import { cn, getCategoryConfig, getCategoryStyle, hasPermissions } from '$lib/utils'
  import type { SnapshotFrom } from 'xstate'
  import AdminChallengesDetailsDialogs from './admin-challenges-details-dialogs.svelte'
  import AdminChallengesDetailsForm from './admin-challenges-details-form.svelte'

  interface Props {
    snapshot: SnapshotFrom<typeof editorMachine>
    send: (event: Parameters<SnapshotFrom<typeof editorMachine>['can']>[0]) => void
  }

  let { snapshot, send }: Props = $props()

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const updateMutation = useUpdateChallengeMutation()
  const deleteMutation = useDeleteChallengeMutation()

  const user = $derived($userQuery.data)
  const hasWritePerms = $derived(hasPermissions(user, Permissions.challsWrite))

  const challenge = $derived(snapshot.context.challenge)
  const form = $derived(snapshot.context.form)

  const challengeDetailQuery = $derived(useAdminChallenge(challenge?.id ?? '', !!challenge?.id))
  const challengeDetail = $derived($challengeDetailQuery.data)

  let prevDetailId: string | undefined = undefined
  $effect(() => {
    if (
      challengeDetail &&
      challenge?.id === challengeDetail.id &&
      challengeDetail.id !== prevDetailId
    ) {
      prevDetailId = challengeDetail.id
      send({ type: 'DETAIL_LOADED', detail: challengeDetail })
    }
  })

  const isIdle = $derived(snapshot.matches('idle'))
  const isEditing = $derived(snapshot.matches('editing'))
  const isCreating = $derived(snapshot.matches('creating'))
  const isSaving = $derived(snapshot.matches('saving'))
  const isConfirmDiscard = $derived(snapshot.matches('confirmDiscard'))
  const isConfirmDelete = $derived(snapshot.matches('confirmDelete'))
  const isDeleting = $derived(snapshot.matches('deleting'))

  const isEditMode = $derived(isEditing || isCreating)
  const isDisabled = $derived(!isEditMode)
  const showContent = $derived(!isIdle)
  const isUpdating = $derived(isSaving || $updateMutation.isPending)
  const isDeletingChallenge = $derived(isDeleting || $deleteMutation.isPending)

  const categoryConfig = $derived(getCategoryConfig(form.category || 'misc'))
  const categoryStyle = $derived(getCategoryStyle(categoryConfig.color))

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    send({ type: 'UPDATE_FORM', field, value })
  }

  async function handleSave() {
    if (!hasWritePerms) {
      toast.error('You do not have permission to edit challenges')
      return
    }

    const id = isCreating ? crypto.randomUUID() : challenge!.id

    send({ type: 'SAVE' })

    $updateMutation.mutate(
      {
        id,
        data: {
          name: form.name,
          category: form.category,
          author: form.author,
          description: form.description,
          flag: form.flag,
          points: { min: form.pointsMin, max: form.pointsMax },
          tiebreakEligible: form.tiebreakEligible,
          sortWeight: form.sortWeight || undefined,
          files: form.files,
          instancerConfig: form.instancerConfig,
        },
      },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeUpdateV2.kind) {
            toast.success(isCreating ? 'Challenge created!' : 'Challenge saved!')
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminChallenges,
            })
            if (challenge?.id) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.adminChallenge(challenge.id),
              })
            }
            send({
              type: 'SAVE_SUCCESS',
              challenge: {
                id,
                name: form.name,
                category: form.category,
                author: form.author,
                description: form.description,
                flag: form.flag,
                points: { min: form.pointsMin, max: form.pointsMax },
                files: form.files,
                tiebreakEligible: form.tiebreakEligible,
                sortWeight: form.sortWeight,
                instancerConfig: form.instancerConfig,
              },
            })
          } else if (response.kind === BadInstancerConfig.kind) {
            toast.error(`Instancer config error: ${response.data.error}`)
            send({ type: 'SAVE_ERROR' })
          } else {
            showApiError(response)
            send({ type: 'SAVE_ERROR' })
          }
        },
        onError: error => {
          toast.error(error.message)
          send({ type: 'SAVE_ERROR' })
        },
      }
    )
  }

  function handleDelete() {
    if (!hasWritePerms || !challenge) return
    send({ type: 'DELETE' })
  }

  function handleDeleteConfirm() {
    if (!challenge) return

    send({ type: 'DELETE_CONFIRM' })

    $deleteMutation.mutate(
      { id: challenge.id },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeDelete.kind) {
            toast.success('Challenge deleted!')
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminChallenges,
            })
            send({ type: 'DELETE_SUCCESS' })
          } else {
            showApiError(response)
            send({ type: 'DELETE_ERROR' })
          }
        },
        onError: error => {
          toast.error(error.message)
          send({ type: 'DELETE_ERROR' })
        },
      }
    )
  }

  let showPreviewDialog = $state(false)
  let formValid = $state(true)
  let instancerValid = $state(true)
</script>

{#if showContent}
  {#key challenge?.id ?? 'new'}
    <div class="@container/details flex h-full flex-col">
      <div
        class="flex items-start justify-between gap-4 px-5 py-4 @lg/details:px-9 @lg/details:py-6"
      >
        <div class="flex min-w-0 flex-col gap-1">
          <h2 class="truncate text-2xl">
            {isCreating ? 'New Challenge' : form.name || 'Untitled'}
          </h2>
          <div class="text-foreground-l3 flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
            <span class="shrink-0">by {form.author || 'Unknown'}</span>
            {#if form.category}
              <span class="text-foreground-l5 text-2xl leading-none opacity-50">·</span>
              <span
                class="bg-category-background-l0 text-category-foreground-l1 inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-0.5 text-sm"
                style={categoryStyle}
              >
                <categoryConfig.icon class="size-3.5" />
                {categoryConfig.name}
              </span>
            {:else}
              <span class="text-foreground-l5 text-2xl leading-none opacity-50">·</span>
              <span
                class="bg-background-l2 text-foreground-l4 shrink-0 rounded-lg px-3 py-0.5 text-sm"
              >
                No category
              </span>
            {/if}
          </div>
        </div>

        <div class="hidden items-center gap-2 @xl/details:flex">
          {#if isEditMode}
            {#if !isCreating && challenge}
              <Button
                type="button"
                variant="destructive"
                onclick={handleDelete}
                disabled={isDeletingChallenge}
              >
                {#if isDeletingChallenge}
                  <Spinner class="size-4" />
                {:else}
                  <IconTrashFilled class="size-4" />
                {/if}
                Delete
              </Button>
            {/if}
            <Button type="button" variant="secondary" onclick={() => send({ type: 'CANCEL' })}>
              Cancel
            </Button>
            <Tooltip.Root disabled={formValid && instancerValid}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  onclick={handleSave}
                  disabled={isUpdating || !formValid || !instancerValid}
                >
                  {#if isUpdating}
                    <Spinner class="size-4" />
                  {/if}
                  {isCreating ? 'Create' : 'Save'}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>Resolve all issues to save</Tooltip.Content>
            </Tooltip.Root>
          {:else if hasWritePerms}
            <Button type="button" onclick={() => send({ type: 'EDIT' })}>
              <IconPencilFilled class="size-4" />
              Edit
            </Button>
          {/if}
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-col">
        <AdminChallengesDetailsForm
          name={form.name}
          category={form.category}
          author={form.author}
          description={form.description}
          flag={form.flag}
          pointsMin={form.pointsMin}
          pointsMax={form.pointsMax}
          tiebreakEligible={form.tiebreakEligible}
          sortWeight={form.sortWeight}
          files={form.files}
          instancerConfig={form.instancerConfig}
          {isDisabled}
          bind:formValid
          bind:instancerValid
          onShowPreview={() => (showPreviewDialog = true)}
          onFilesChange={files => send({ type: 'UPDATE_FILES', files })}
          onInstancerConfigChange={config =>
            send({ type: 'UPDATE_INSTANCER', instancerConfig: config })}
          onNameChange={v => updateField('name', v)}
          onCategoryChange={v => updateField('category', v)}
          onAuthorChange={v => updateField('author', v)}
          onDescriptionChange={v => updateField('description', v)}
          onFlagChange={v => updateField('flag', v)}
          onPointsMinChange={v => updateField('pointsMin', v)}
          onPointsMaxChange={v => updateField('pointsMax', v)}
          onTiebreakEligibleChange={v => updateField('tiebreakEligible', v)}
          onSortWeightChange={v => updateField('sortWeight', v)}
        >
          {#snippet actions()}
            {#if isEditMode}
              {#if !isCreating && challenge}
                <Button
                  type="button"
                  variant="destructive"
                  onclick={handleDelete}
                  disabled={isDeletingChallenge}
                >
                  {#if isDeletingChallenge}
                    <Spinner class="size-4" />
                  {:else}
                    <IconTrashFilled class="size-4" />
                  {/if}
                  Delete
                </Button>
              {/if}
              <Button type="button" variant="secondary" onclick={() => send({ type: 'CANCEL' })}>
                Cancel
              </Button>
              <Tooltip.Root disabled={formValid && instancerValid}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    onclick={handleSave}
                    disabled={isUpdating || !formValid || !instancerValid}
                  >
                    {#if isUpdating}
                      <Spinner class="size-4" />
                    {/if}
                    {isCreating ? 'Create' : 'Save'}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Resolve all issues to save</Tooltip.Content>
              </Tooltip.Root>
            {:else if hasWritePerms}
              <Button type="button" onclick={() => send({ type: 'EDIT' })}>
                <IconPencilFilled class="size-4" />
                Edit
              </Button>
            {/if}
          {/snippet}
        </AdminChallengesDetailsForm>
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

<AdminChallengesDetailsDialogs
  showUnsavedDialog={isConfirmDiscard}
  {showPreviewDialog}
  showDeleteDialog={isConfirmDelete}
  description={form.description}
  challengeName={form.name}
  isDeleting={isDeletingChallenge}
  onDiscardChanges={() => send({ type: 'DISCARD' })}
  onCancelDiscard={() => send({ type: 'KEEP_EDITING' })}
  onClosePreview={() => (showPreviewDialog = false)}
  onDeleteConfirm={handleDeleteConfirm}
  onDeleteCancel={() => send({ type: 'DELETE_CANCEL' })}
/>
