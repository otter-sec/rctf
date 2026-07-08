<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'

  type Props = SVGAttributes<SVGSVGElement>

  let { ...rest }: Props = $props()
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...rest}>
  <path
    fill="currentColor"
    d="M16 3a1 1 0 0 1 .117 1.993L16 5v4.764l1.894 3.789a1 1 0 0 1 .1.331l.006.116v2a1 1 0 0 1-.883.993L17 17h-4v4a1 1 0 0 1-1.993.117L11 21v-4H7a1 1 0 0 1-.993-.883L6 16v-2a1 1 0 0 1 .06-.34l.046-.107L8 9.763V5a1 1 0 0 1-.117-1.993L8 3h8z"
  />
</svg>
