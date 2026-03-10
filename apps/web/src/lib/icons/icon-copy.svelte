<script lang="ts">
  interface Props {
    class?: string
  }

  let { class: className }: Props = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  class={className}
>
  <g fill="currentColor"
    ><path
      d="M20.926 7.074A3.67 3.67 0 0 1 22 9.667v8.666A3.667 3.667 0 0 1 18.333 22H9.667A3.667 3.667 0 0 1 6 18.333V9.667q0-.053.005-.102A3.66 3.66 0 0 1 9.667 6h8.666c.973 0 1.905.386 2.593 1.074"
    /><path
      d="M17.374 3.514a1 1 0 1 1-1.748.972C15.405 4.088 15.284 4 15 4H5c-.548 0-1 .452-1 1v9.998c0 .36.194.692.507.87a1 1 0 1 1-.99 1.738A3 3 0 0 1 2 15V5c0-1.652 1.348-3 3-3h10c1.094 0 1.828.533 2.374 1.514"
    /></g
  >
</svg>
