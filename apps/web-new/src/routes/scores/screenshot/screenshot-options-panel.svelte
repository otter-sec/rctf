<script lang="ts">
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import Checkbox from '$lib/ui/checkbox.svelte'
  import Input from '$lib/ui/input.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import {
    FORMAT_OPTIONS,
    getEmphasizeListedState,
    getEmphasizeSelfOnlyState,
    SCALE_OPTIONS,
    TEAM_COUNT_OPTIONS,
    type ExportSettings,
    type ScreenshotOptions,
  } from './options'

  interface Props {
    options: ScreenshotOptions
    exportSettings: ExportSettings
    hasSelf: boolean
  }

  let { options, exportSettings, hasSelf }: Props = $props()

  const teamCountItems = $derived<MenuItem[]>(
    TEAM_COUNT_OPTIONS.map(count => ({
      value: String(count),
      label: `${count} teams`,
      checked: options.teamCount === count,
      onSelect: () => (options.teamCount = count),
    }))
  )

  const graphTeamCountItems = $derived<MenuItem[]>(
    TEAM_COUNT_OPTIONS.map(count => ({
      value: String(count),
      label: `${count} teams`,
      checked: options.graphTeamCount === count,
      onSelect: () => (options.graphTeamCount = count),
    }))
  )

  const scaleItems = $derived<MenuItem[]>(
    SCALE_OPTIONS.map(scale => ({
      value: String(scale),
      label: `${scale}x`,
      checked: exportSettings.scale === scale,
      onSelect: () => (exportSettings.scale = scale),
    }))
  )

  const formatItems = $derived<MenuItem[]>(
    FORMAT_OPTIONS.map(format => ({
      value: format,
      label: format.toUpperCase(),
      checked: exportSettings.format === format,
      onSelect: () => (exportSettings.format = format),
    }))
  )

  const selfOnlyState = $derived(getEmphasizeSelfOnlyState(options, hasSelf))
  const listedState = $derived(getEmphasizeListedState(options))
</script>

{#snippet selectTrigger(label: string, ariaLabel: string, items: MenuItem[])}
  <Menu label={ariaLabel} {items} placement="bottom-start">
    {#snippet trigger({ props })}
      <button {...props} type="button" data-select>
        <span>{label}</span>
        <IconChevronDown aria-hidden="true" />
      </button>
    {/snippet}
  </Menu>
{/snippet}

<options-panel>
  <Section title="Content">
    <panel-field>
      <span data-label>Teams in list</span>
      {@render selectTrigger(`${options.teamCount} teams`, 'Teams in list', teamCountItems)}
    </panel-field>

    <panel-field>
      <span data-label>Teams in graph</span>
      {@render selectTrigger(
        `${options.graphTeamCount} teams`,
        'Teams in graph',
        graphTeamCountItems
      )}
    </panel-field>

    <panel-field>
      <span data-label>Subtitle</span>
      <Input bind:value={options.subtitle} placeholder="Optional subtitle" />
    </panel-field>
  </Section>

  <Section title="Display">
    <toggle-list>
      <Checkbox bind:checked={options.showHeader}>Show header</Checkbox>
      <Checkbox bind:checked={options.showGraph}>Show graph</Checkbox>

      {#if selfOnlyState.visible}
        {#if selfOnlyState.disabled}
          <Tooltip label={selfOnlyState.reason ?? ''}>
            {#snippet children({ props })}
              <toggle-row {...props} data-inset data-disabled>
                <Checkbox checked={false} disabled />
                <span>Emphasize your team only</span>
              </toggle-row>
            {/snippet}
          </Tooltip>
        {:else}
          <toggle-row data-inset>
            <Checkbox bind:checked={options.emphasizeSelfOnly}>Emphasize your team only</Checkbox>
          </toggle-row>
        {/if}
      {/if}

      {#if listedState.visible}
        {#if listedState.disabled}
          <Tooltip label={listedState.reason ?? ''}>
            {#snippet children({ props })}
              <toggle-row {...props} data-inset data-disabled>
                <Checkbox checked={options.emphasizeListedTeams} disabled />
                <span>Emphasize listed teams</span>
              </toggle-row>
            {/snippet}
          </Tooltip>
        {:else}
          <toggle-row data-inset>
            <Checkbox bind:checked={options.emphasizeListedTeams}>Emphasize listed teams</Checkbox>
          </toggle-row>
        {/if}
      {/if}

      <Checkbox bind:checked={options.showAvatars}>Show avatars</Checkbox>
      <Checkbox bind:checked={options.showFlags}>Show flags</Checkbox>
      <Checkbox bind:checked={options.showStatuses}>Show statuses</Checkbox>
      <Checkbox bind:checked={options.showSolveCount}>Show solve count</Checkbox>
      <Checkbox bind:checked={options.showSparklines}>Show sparklines</Checkbox>
      <Checkbox bind:checked={options.showMatrix}>Show category matrix</Checkbox>

      {#if hasSelf}
        <Checkbox bind:checked={options.showSelf}>Show your team</Checkbox>
      {/if}
    </toggle-list>
  </Section>

  <Section title="Export">
    <panel-field>
      <span data-label>Resolution</span>
      {@render selectTrigger(`${exportSettings.scale}x`, 'Resolution', scaleItems)}
    </panel-field>

    <panel-field>
      <span data-label>Format</span>
      {@render selectTrigger(exportSettings.format.toUpperCase(), 'Format', formatItems)}
    </panel-field>
  </Section>
</options-panel>

<style>
  options-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  panel-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);

    span[data-label] {
      color: var(--foreground-l2);
      font-size: var(--step--1);
    }
  }

  button[data-select] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      font-size: 1rem;
      opacity: 0.5;
    }

    &:hover {
      background: color-mix(in oklab, var(--foreground-l0) 4%, var(--background-l4));
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }
  }

  toggle-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    color: var(--foreground-l2);
    font-size: var(--step--1);
  }

  toggle-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);

    &[data-inset] {
      padding-inline-start: var(--space-s);
    }

    &[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
