<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    label?: string
    description?: string
    hint?: string
    error?: string | null
    incomplete?: boolean
    children: Snippet<[{ id: string; describedBy: string | undefined }]>
  }

  let { label, description, hint, error = null, incomplete = false, children }: Props = $props()

  const uid = $props.id()
  const describedBy = $derived(
    [description && `${uid}-description`, error && `${uid}-error`].filter(Boolean).join(' ') ||
      undefined
  )
</script>

<form-field
  data-invalid={error && !incomplete ? '' : undefined}
  data-incomplete={error && incomplete ? '' : undefined}
>
  {#if label}
    <label for={uid}>
      {label}
      {#if hint}<field-hint>({hint})</field-hint>{/if}
    </label>
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

  field-hint {
    font-size: var(--step--1);
    color: var(--foreground-l4);
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

  form-field[data-incomplete] field-error {
    color: var(--foreground-l3);
  }
</style>
