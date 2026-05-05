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
  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m6-3h.01M15 9h.01" />
    <path d="M8 13a4 4 0 1 0 8 0z" />
  </g>
</svg>
