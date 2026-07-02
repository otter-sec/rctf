<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    label?: string
    description?: string
    error?: string | null
    children: Snippet<[{ id: string; describedBy: string | undefined }]>
  }

  let { label, description, error = null, children }: Props = $props()

  const uid = $props.id()
  const describedBy = $derived(
    [description && `${uid}-description`, error && `${uid}-error`].filter(Boolean).join(' ') ||
      undefined
  )
</script>

<form-field data-invalid={error ? '' : undefined}>
  {#if label}
    <label for={uid}>{label}</label>
  {/if}
  {@render children({ id: uid, describedBy })}
  {#if description}
    <field-description id="{uid}-description">{description}</field-description>
  {/if}
  {#if error}
    <field-error id="{uid}-error" role="alert">{error}</field-error>
  {/if}
</form-field>

<style>
  form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;

    &[data-invalid] label {
      color: var(--foreground-destructive);
    }
  }

  field-description {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  field-error {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-destructive);
  }
</style>
