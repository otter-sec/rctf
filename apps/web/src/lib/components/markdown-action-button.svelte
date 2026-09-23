<script lang="ts">
  import { IconArrowRight } from '$lib/icons'
  import Button from '$lib/ui/button.svelte'

  type Props = {
    href: string
    label: string
  }

  let { href, label }: Props = $props()
</script>

<markdown-action-button>
  <Button {href} size="lg" disabled={!href}>
    {label}
    <IconArrowRight />
  </Button>
</markdown-action-button>

<style>
  markdown-action-button {
    display: flex;
    justify-content: center;
  }
</style>
