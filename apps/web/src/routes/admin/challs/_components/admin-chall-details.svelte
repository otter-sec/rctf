<script lang="ts">
  import {
    GoodChallengeDelete,
    GoodChallengeUpdate,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { AdminChallenge, AdminChallengeDetail } from '$lib/api'
  import { EmptyState, ScrollArea } from '$lib/components'
  import { IconHammer } from '$lib/icons'
  import {
    queryKeys,
    useAdminChallenge,
    useCurrentUser,
    useDeleteChallengeMutation,
    useUpdateChallengeMutation,
  } from '$lib/query'
  import { cn, getCategoryConfig, getCategoryStyle } from '$lib/utils'
  import { hasPermissions } from '$lib/utils/permissions'
  import Actions from './admin-chall-actions.svelte'
  import Dialogs from './admin-chall-dialogs.svelte'
  import Form from './admin-chall-form.svelte'

  interface Props {
    challenge: AdminChallenge | null
    isCreatingNew: boolean
    onSaved: (challenge: AdminChallenge) => void
    onDeleted: () => void
    onCancelNew: () => void
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

  const user = $derived($userQuery.data)
  const hasWritePerms = $derived(hasPermissions(user, Permissions.challsWrite))

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
      description = challenge.description ?? ''
      flag = challenge.flag ?? ''
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

  function handleFilesChange(newFiles: { name: string; url: string }[]) {
    files = newFiles
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
          <div class={cn(isDisabled && 'opacity-50 pointer-events-none')}>
            <Form
              bind:name
              bind:category
              bind:author
              bind:description
              bind:flag
              bind:pointsMin
              bind:pointsMax
              bind:tiebreakEligible
              bind:sortWeight
              bind:files
              {isDisabled}
              onShowPreview={() => (showPreviewDialog = true)}
              onFilesChange={handleFilesChange}
            />
          </div>
        </ScrollArea>
      </div>

      <Actions
        {isEditMode}
        {isCreatingNew}
        {hasWritePerms}
        hasChallenge={!!challenge}
        isUpdating={$updateMutation.isPending}
        isDeleting={$deleteMutation.isPending}
        onEdit={handleEnterEditMode}
        onCancel={handleCancelEdit}
        onSave={handleSave}
        onDelete={handleDeleteClick}
      />
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
  bind:showUnsavedDialog
  bind:showPreviewDialog
  bind:showDeleteDialog
  {description}
  challengeName={name}
  isDeleting={$deleteMutation.isPending}
  onDiscardChanges={handleDiscardChanges}
  onCancelDiscard={handleCancelDiscard}
  onClosePreview={() => (showPreviewDialog = false)}
  onDeleteConfirm={handleDeleteConfirm}
  onDeleteCancel={() => (showDeleteDialog = false)}
/>
