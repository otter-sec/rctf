<script lang="ts">
  import {
    BadAdminBotConfig,
    BadBody,
    BadInstancerConfig,
    DeleteChallengeRoute,
    GoodChallengeDelete,
    GoodChallengeUpdateV2,
    Permissions,
    UpdateChallengeRouteV2,
    type InstancerConfig,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import { IconFlagBannerFold, IconTrash } from '$lib/icons'
  import { useChallenges } from '$lib/query/challenges'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import { hasPermissions } from '$lib/utils/permissions'
  import {
    cancel,
    del,
    deleteCancel,
    deleteConfirm,
    deleteError,
    deleteSuccess,
    discard,
    edit,
    keepEditing,
    save,
    saveError,
    saveSuccess,
    updateAdminBot,
    updateFiles,
    updateForm,
    updateInstancer,
    updateScoring,
    type AdminBotConfig,
    type EditorForm,
    type EditorState,
    type ScoringConfig,
  } from '../model/editor-state'
  import AdminChallengesDetailsForm from './details-form.svelte'
  import AdminChallengesDetailsDialogs from './dialogs.svelte'
  import { buildSavePayload, formErrors, hasFormErrors } from './form-validation'

  interface Props {
    editor: EditorState
    onEditorChange: (next: EditorState) => void
  }

  let { editor, onEditorChange }: Props = $props()

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const canWrite = $derived(hasPermissions(userQuery.data, Permissions.challsWrite))

  const challengesQuery = useChallenges()
  const totalSolves = $derived(
    challengesQuery.data?.find(c => c.id === editor.challenge?.id)?.solves ?? 0
  )

  const isEditMode = $derived(editor.mode === 'editing' || editor.mode === 'creating')
  const disabled = $derived(!isEditMode)
  const isSaving = $derived(editor.mode === 'saving')
  const isDeleting = $derived(editor.mode === 'deleting')

  const errors = $derived(formErrors(editor.form))
  let instancerValid = $state(true)
  const invalid = $derived(hasFormErrors(errors) || !instancerValid)

  const heading = $derived(
    editor.mode === 'creating' ? 'New Challenge' : editor.form.name || 'Untitled'
  )
  const categoryConfig = $derived(
    editor.form.category ? getCategoryConfig(editor.form.category) : null
  )

  function onFieldChange<K extends keyof EditorForm>(field: K, value: EditorForm[K]) {
    onEditorChange(updateForm(editor, field, value))
  }

  function onScoringChange(scoring: ScoringConfig) {
    onEditorChange(updateScoring(editor, scoring))
  }

  function onFilesChange(files: EditorForm['files']) {
    onEditorChange(updateFiles(editor, files))
  }

  function onInstancerChange(config: InstancerConfig | null) {
    onEditorChange(updateInstancer(editor, config))
  }

  function onAdminBotChange(config: AdminBotConfig) {
    onEditorChange(updateAdminBot(editor, config))
  }

  async function handleSave() {
    if (!canWrite) {
      toast.error('You do not have permission to edit challenges')
      return
    }
    const current = editor
    const wasCreating = current.mode === 'creating'
    const id = wasCreating ? crypto.randomUUID() : current.challenge!.id
    onEditorChange(save(current))

    try {
      const response = await apiRequest(UpdateChallengeRouteV2, buildSavePayload(current.form, id))
      if (response.kind === GoodChallengeUpdateV2.kind) {
        toast.success(wasCreating ? 'Challenge created!' : 'Challenge saved!')
        queryClient.invalidateQueries({ queryKey: queryKeys.adminChallenges })
        if (!wasCreating) {
          queryClient.invalidateQueries({ queryKey: queryKeys.adminChallenge(id) })
        }
        onEditorChange(saveSuccess(save(current), response.data))
      } else if (response.kind === BadAdminBotConfig.kind) {
        toast.error(`Admin bot config error: ${response.data.error}`)
        onEditorChange(saveError(save(current)))
      } else if (response.kind === BadInstancerConfig.kind) {
        toast.error(`Instancer config error: ${response.data.error}`)
        onEditorChange(saveError(save(current)))
      } else if (response.kind === BadBody.kind) {
        toast.error(response.data.reason)
        onEditorChange(saveError(save(current)))
      } else {
        showApiError(response)
        onEditorChange(saveError(save(current)))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save challenge')
      onEditorChange(saveError(save(current)))
    }
  }

  async function handleDeleteConfirm() {
    const current = editor
    if (!current.challenge) return
    const id = current.challenge.id
    onEditorChange(deleteConfirm(current))

    try {
      const response = await apiRequest(DeleteChallengeRoute, { id })
      if (response.kind === GoodChallengeDelete.kind) {
        toast.success('Challenge deleted!')
        queryClient.invalidateQueries({ queryKey: queryKeys.adminChallenges })
        onEditorChange(deleteSuccess(deleteConfirm(current)))
      } else {
        showApiError(response)
        onEditorChange(deleteError(deleteConfirm(current)))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete challenge')
      onEditorChange(deleteError(deleteConfirm(current)))
    }
  }
</script>

{#snippet actionButtons()}
  {#if isEditMode}
    {#if editor.mode === 'editing' && editor.challenge}
      <Button
        variant="destructive"
        disabled={isDeleting}
        onclick={() => onEditorChange(del(editor))}
      >
        {#if isDeleting}<Spinner />{:else}<IconTrash />{/if}
        Delete
      </Button>
    {/if}
    <Button variant="secondary" onclick={() => onEditorChange(cancel(editor))}>Cancel</Button>
    {#if invalid}
      <Tooltip label="Resolve all issues to save">
        {#snippet children({ props })}
          <span {...props}>
            <Button disabled>
              {editor.mode === 'creating' ? 'Create' : 'Save'}
            </Button>
          </span>
        {/snippet}
      </Tooltip>
    {:else}
      <Button disabled={isSaving} onclick={handleSave}>
        {#if isSaving}<Spinner />{/if}
        {editor.mode === 'creating' ? 'Create' : 'Save'}
      </Button>
    {/if}
  {:else if canWrite}
    <Button onclick={() => onEditorChange(edit(editor))}>Edit</Button>
  {/if}
{/snippet}

<admin-challenges-details>
  {#if editor.mode === 'idle'}
    <details-empty>
      <EmptyState
        icon={IconFlagBannerFold}
        title="Select a challenge"
        subtitle="Choose a challenge from the list to view or edit it."
      />
    </details-empty>
  {:else}
    <details-header>
      <header-info>
        <h1>{heading}</h1>
        <header-meta>
          <span>by {editor.form.author || 'Unknown'}</span>
          {#if categoryConfig}
            <category-pill data-category-color={categoryConfig.color}>
              <categoryConfig.icon />
              {categoryConfig.name}
            </category-pill>
          {:else}
            <category-pill data-empty>No category</category-pill>
          {/if}
        </header-meta>
      </header-info>
      <header-actions>{@render actionButtons()}</header-actions>
    </details-header>

    <AdminChallengesDetailsForm
      form={editor.form}
      {disabled}
      autofocusName={editor.mode === 'creating'}
      {totalSolves}
      challengeId={editor.challenge?.id ?? null}
      {errors}
      bind:instancerValid
      {onFieldChange}
      {onScoringChange}
      {onFilesChange}
      {onInstancerChange}
      {onAdminBotChange}
    />

    {#if isEditMode || canWrite}
      <details-footer>{@render actionButtons()}</details-footer>
    {/if}
  {/if}
</admin-challenges-details>

<AdminChallengesDetailsDialogs
  unsavedOpen={editor.mode === 'confirmDiscard'}
  deleteOpen={editor.mode === 'confirmDelete'}
  challengeName={editor.form.name}
  deleting={isDeleting}
  onKeepEditing={() => onEditorChange(keepEditing(editor))}
  onDiscard={() => onEditorChange(discard(editor))}
  onDeleteConfirm={handleDeleteConfirm}
  onDeleteCancel={() => onEditorChange(deleteCancel(editor))}
/>

<style>
  admin-challenges-details {
    container: challenge-details / inline-size;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    inline-size: 100%;
  }

  details-empty {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
    padding: var(--space-l);
  }

  details-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-m);
    flex-wrap: wrap;
    padding: var(--space-m) var(--space-l);
  }

  header-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    min-inline-size: 0;
  }

  h1 {
    margin: 0;
    font-size: var(--step-2);
    color: var(--foreground-l0);
    overflow-wrap: anywhere;
  }

  header-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
  }

  category-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3xs);
    padding: 0.125rem var(--space-2xs);
    font-size: var(--step--1);
    color: var(--category-foreground-l1);
    background: var(--category-background-l0);
    border-radius: var(--radius-md);

    &[data-empty] {
      color: var(--foreground-l4);
      background: var(--background-l2);
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }
  }

  header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  details-footer {
    display: none;
    flex-shrink: 0;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2xs);
    padding: var(--space-s) var(--space-l);
    background: var(--background-l2);
  }

  @container challenge-details (width < 46rem) {
    header-actions {
      display: none;
    }

    details-footer {
      display: flex;
    }
  }
</style>
