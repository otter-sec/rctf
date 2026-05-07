<script lang="ts">
  import SubmissionResultDot from './submission-result-dot.svelte'
  import { resultLabel, resultTone } from './submissions-utils'

  interface Props {
    result: string
  }

  let { result }: Props = $props()
  const tone = $derived(resultTone(result))
</script>

<span
  class="inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap"
  class:text-foreground-success={tone === 'success'}
  class:text-foreground-yellow-l1={tone === 'warning'}
  class:text-foreground-destructive={tone === 'danger'}
>
  <SubmissionResultDot {result} />
  <span class="min-w-0 truncate">{resultLabel(result)}</span>
</span>
