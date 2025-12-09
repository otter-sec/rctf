<script lang="ts">
  import { useMachine } from '@xstate/svelte'
  import { Resizable } from '$lib/components'
  import { editorMachine } from '$lib/machines'
  import { useAdminChallenges } from '$lib/query'
  import Details from './details.svelte'
  import List from './list.svelte'

  const challengesQuery = useAdminChallenges()
  const { snapshot, send } = useMachine(editorMachine)

  const challenges = $derived($challengesQuery.data ?? [])
  const selectedId = $derived(
    $snapshot.matches('idle') ? null : ($snapshot.context.challenge?.id ?? null)
  )
  const isCreating = $derived($snapshot.matches('creating'))
</script>

<div class="h-[calc(100vh-72px)]">
  <Resizable.PaneGroup direction="horizontal" class="gap-2">
    <Resizable.Pane defaultSize={40} minSize={20} maxSize={45}>
      <div class="h-full rounded-r-3xl bg-background-l1">
        <List
          {challenges}
          {selectedId}
          isCreatingNew={isCreating}
          onSelect={c => send({ type: 'SELECT', challenge: c })}
          onCreateNew={() => send({ type: 'CREATE' })} />
      </div>
    </Resizable.Pane>
    <Resizable.Handle withHandle />
    <Resizable.Pane defaultSize={60} minSize={40}>
      <div class="h-full rounded-l-3xl bg-background-l1">
        <Details snapshot={$snapshot} {send} />
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>
