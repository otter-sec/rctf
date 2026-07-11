<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'

  type Props = SVGAttributes<SVGSVGElement>

  let { ...rest }: Props = $props()
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...rest}>
  <path
    fill="currentColor"
    d="M20.118 3H3.893A2.914 2.914 0 0 0 1.39 7.371L9.506 20.92a2.917 2.917 0 0 0 4.987.005l8.11-13.539A2.914 2.914 0 0 0 20.117 3z"
  />
</svg>
