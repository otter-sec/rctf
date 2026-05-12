<script lang="ts">
  import { resultTone } from '../submissions-utils'

  interface Props {
    result: string
  }

  let { result }: Props = $props()
  const tone = $derived(resultTone(result))
</script>

<span
  class="size-1.5 shrink-0 rounded-full"
  class:bg-foreground-success={tone === 'success'}
  class:bg-foreground-yellow-l1={tone === 'warning'}
  class:bg-foreground-destructive={tone === 'danger'}
></span>
