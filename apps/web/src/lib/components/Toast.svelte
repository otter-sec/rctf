<script lang="ts">
  import { toast } from '$lib/stores'
</script>

{#if toast.toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {#each toast.toasts as t (t.id)}
      <div class="flex items-start gap-3" role="alert">
        <span class="flex-1">[{t.type}] {t.message}</span>
        <button
          type="button"
          onclick={() => toast.remove(t.id)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    {/each}
  </div>
{/if}
