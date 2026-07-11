<script lang="ts">
  import { resultLabel, resultTone } from '../submissions-model'

  type Props = {
    result: string
  }

  let { result }: Props = $props()

  const tone = $derived(resultTone(result))
</script>

<result-cell data-tone={tone}>
  <result-dot aria-hidden="true"></result-dot>
  <span>{resultLabel(result)}</span>
</result-cell>

<style>
  result-cell {
    display: inline-flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3xs);
    white-space: nowrap;

    &[data-tone='success'] {
      --result-color: var(--foreground-success);
    }
    &[data-tone='warning'] {
      --result-color: var(--foreground-yellow-l1);
    }
    &[data-tone='danger'] {
      --result-color: var(--foreground-destructive);
    }

    span {
      min-inline-size: 0;
      overflow: hidden;
      color: var(--result-color, var(--foreground-l1));
      text-overflow: ellipsis;
    }
  }

  result-dot {
    flex-shrink: 0;
    inline-size: 0.375rem;
    block-size: 0.375rem;
    background: var(--result-color, var(--foreground-l3));
    border-radius: 50%;
  }
</style>
