<script lang="ts">
  import {
    GoodChallengeDelete,
    GoodChallengeUpdate,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Button, EmptyState, ScrollArea, Spinner } from '$lib/components'
  import { IconHammer, IconPencilFilled, IconTrashFilled } from '$lib/icons'
  import {
    queryKeys,
    useAdminChallenge,
    useCurrentUser,
    useDeleteChallengeMutation,
    useUpdateChallengeMutation,
  } from '$lib/query'
  import { cn, getCategoryConfig, getCategoryStyle } from '$lib/utils'
  import { hasPermissions } from '$lib/utils/permissions'
  import type { SnapshotFrom } from 'xstate'
  import Dialogs from './dialogs.svelte'
  import type { editorMachine, FormData } from './editor-machine'
  import Form from './form.svelte'

  interface Props {
    snapshot: SnapshotFrom<typeof editorMachine>
    send: (
      event: Parameters<SnapshotFrom<typeof editorMachine>['can']>[0]
    ) => void
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

  const challengeDetailQuery = $derived(
    useAdminChallenge(challenge?.id ?? '', !!challenge?.id)
  )
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
        },
      },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeUpdate.kind) {
            toast.success(
              isCreating ? 'Challenge created!' : 'Challenge saved!'
            )
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
                instancerConfig: null,
              },
            })
          } else {
            toast.error(response.message)
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
            toast.error(response.message)
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
</script>

{#if showContent}
  {#key challenge?.id ?? 'new'}
    <div class="flex h-full flex-col">
      <div class="flex flex-col py-6">
        <div class="px-9 flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-2xl">
              {isCreating ? 'New Challenge' : form.name || 'Untitled'}
            </h2>
            <div class="flex items-center gap-2 text-foreground-l3 text-base">
              <span>by {form.author || 'Unknown'}</span>
              <span class="text-foreground-l5 opacity-50 text-2xl leading-none"
                >·</span
              >
              <div class="flex gap-1">
                {#if form.category}
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
              {form.pointsMin}–{form.pointsMax} pts
            </h2>
            {#if !isCreating && challenge}
              <p class="text-right text-foreground-l5 text-base font-mono">
                {challenge.id}
              </p>
            {/if}
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 bg-background-l1">
        <ScrollArea class="h-full px-5" fadeSize={64} fadeColor="background-l1">
          <div class={cn(isDisabled && 'opacity-50 pointer-events-none')}>
            <Form
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
              {isDisabled}
              onShowPreview={() => (showPreviewDialog = true)}
              onFilesChange={files => send({ type: 'UPDATE_FILES', files })}
              onNameChange={v => updateField('name', v)}
              onCategoryChange={v => updateField('category', v)}
              onAuthorChange={v => updateField('author', v)}
              onDescriptionChange={v => updateField('description', v)}
              onFlagChange={v => updateField('flag', v)}
              onPointsMinChange={v => updateField('pointsMin', v)}
              onPointsMaxChange={v => updateField('pointsMax', v)}
              onTiebreakEligibleChange={v => updateField('tiebreakEligible', v)}
              onSortWeightChange={v => updateField('sortWeight', v)}
            />
          </div>
        </ScrollArea>
      </div>

      <div
        class="flex items-center justify-between gap-4 bg-background-l1 px-5 py-4"
      >
        {#if isEditMode}
          <div class="flex items-center gap-3">
            {#if !isCreating && challenge}
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onclick={handleDelete}
                disabled={isDeletingChallenge}
              >
                {#if isDeletingChallenge}
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
              onclick={() => send({ type: 'CANCEL' })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              onclick={handleSave}
              disabled={isUpdating}
            >
              {#if isUpdating}
                <Spinner class="size-5" />
              {/if}
              {isCreating ? 'Create challenge' : 'Save changes'}
            </Button>
          </div>
        {:else if hasWritePerms}
          <div></div>
          <Button
            type="button"
            size="lg"
            onclick={() => send({ type: 'EDIT' })}
          >
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

<Dialogs
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
