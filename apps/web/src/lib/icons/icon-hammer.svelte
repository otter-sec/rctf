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
  <path
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="m11.414 10l-7.383 7.418a2.09 2.09 0 0 0 0 2.967a2.11 2.11 0 0 0 2.976 0L14.414 13m3.707 2.293l2.586-2.586a1 1 0 0 0 0-1.414l-7.586-7.586a1 1 0 0 0-1.414 0L9.121 6.293a1 1 0 0 0 0 1.414l7.586 7.586a1 1 0 0 0 1.414 0"
  />
</svg>
