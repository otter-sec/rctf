<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'

  type Props = SVGAttributes<SVGSVGElement>

  let { ...rest }: Props = $props()
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...rest}>
  <path
    fill="currentColor"
    d="m15.707 4.293l3 3a1 1 0 0 1 0 1.414l-1.553 1.555a7 7 0 0 1-.256 9.74L19 20a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2h1v-1a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2v1h4a5 5 0 0 0 3.737-8.323l-3.03 3.03a1 1 0 0 1-1.414 0l-.793-.792l-.793.792a1 1 0 1 1-1.414-1.414l.792-.793l-.792-.793a1 1 0 0 1 0-1.414l6-6a1 1 0 0 1 1.414 0m2-2l3 3a1 1 0 1 1-1.414 1.414l-3-3a1 1 0 1 1 1.414-1.414"
  />
</svg>
