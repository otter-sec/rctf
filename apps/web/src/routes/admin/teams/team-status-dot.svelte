<script lang="ts">
  import { statusTone, type TeamDisplayStatus } from './teams-model'

  interface Props {
    status: TeamDisplayStatus
  }

  let { status }: Props = $props()
  const tone = $derived(statusTone(status))
</script>

<span
  class="size-1.5 shrink-0 rounded-full"
  class:bg-foreground-success={tone === 'success'}
  class:bg-foreground-yellow-l1={tone === 'warning'}
  class:bg-foreground-destructive={tone === 'danger'}
  class:bg-foreground-accent={tone === 'accent'}
></span>
