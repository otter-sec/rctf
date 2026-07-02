<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'

  type Props = SVGAttributes<SVGSVGElement>

  let { ...rest }: Props = $props()
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...rest}>
  <path
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M12 3v6l3-3M9 6l3 3m0 12v-6l3 3m-6 0l3-3m-8-3h1m4 0h1m4 0h1m4 0h1"
  />
</svg>
