<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'

  type Props = SVGAttributes<SVGSVGElement>

  let { ...rest }: Props = $props()
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...rest}>
  <path
    fill="currentColor"
    d="M12 1c6.075 0 11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12S5.925 1 12 1m0 5a1 1 0 0 0-1 1v5l.007.117a1 1 0 0 0 .993.883h4l.117-.007a1 1 0 0 0-.117-1.993h-3V7l-.007-.117A1 1 0 0 0 12 6"
  />
</svg>
