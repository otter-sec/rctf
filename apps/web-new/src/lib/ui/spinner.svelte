<script lang="ts">
  type Props = {
    label?: string
  }

  let { label = 'Loading' }: Props = $props()
</script>

<span role="status" aria-label={label}>
  <!-- path vendored from lucide loader-circle: https://lucide.dev/icons/loader-circle -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
</span>

<style>
  span {
    display: inline-flex;
  }

  svg {
    inline-size: 1em;
    block-size: 1em;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      rotate: 1turn;
    }
  }
</style>
