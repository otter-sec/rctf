<script lang="ts">
  import { createScoresData } from '../model/data.svelte'
  import type { ScoresUrlState } from '../model/url-state.svelte'
  import ScoresScreenshotModal from './screenshot-modal.svelte'
  import { createScreenshotModel } from './screenshot-model.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    urlState: ScoresUrlState
    ctfName: string
    startTime: number | null
    endTime: number | null
  }

  let { open, onOpenChange, urlState, ctfName, startTime, endTime }: Props =
    $props()

  const data = createScoresData({
    division: () => urlState.division,
    search: () => undefined,
    sortMode: () => urlState.sortMode,
    focusedChallengeId: () => null,
    showTop3Context: () => urlState.showTop3Context,
    showSelfContext: () => urlState.showSelfContext,
  })

  const screenshot = createScreenshotModel(data)
</script>

<ScoresScreenshotModal
  {open}
  {onOpenChange}
  teams={screenshot.teams}
  selfTeam={screenshot.selfTeam}
  graphData={data.graphData}
  categoryGroups={data.categoryGroups}
  solvesByTeam={screenshot.solvesByTeam}
  {ctfName}
  {startTime}
  {endTime}
/>
