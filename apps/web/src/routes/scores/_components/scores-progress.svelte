<script lang="ts">
  interface Props {
    percent: number
    class?: string
  }

  let { percent, class: className = '' }: Props = $props()

  const radius = 10
  const circumference = 2 * Math.PI * radius
  let strokeDashoffset = $derived(circumference * (1 - percent / 100))
</script>

<svg
  class={className}
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <circle
    cx="12"
    cy="12"
    r={radius}
    stroke="currentColor"
    stroke-width="2.5"
    opacity="0.2"
  />
  <circle
    cx="12"
    cy="12"
    r={radius}
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-dasharray={circumference}
    stroke-dashoffset={strokeDashoffset}
    transform="rotate(-90 12 12) scale(1 -1) translate(0 -24)"
  />
</svg>
