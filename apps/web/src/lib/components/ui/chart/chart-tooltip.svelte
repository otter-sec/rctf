<script lang="ts">
  import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils'
  import { getChartContext } from 'layerchart'
  import { Tooltip as TooltipPrimitive } from 'layerchart/svg'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { getPayloadConfigFromPayload, useChart, type TooltipPayload } from './chart-utils'

  type FormattedLabel = string | number | Snippet | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function defaultFormatter(value: any, _payload: TooltipPayload[]) {
    return `${value}`
  }

  let {
    ref = $bindable(null),
    class: className,
    hideLabel = false,
    indicator = 'dot',
    hideIndicator = false,
    labelKey,
    label,
    labelFormatter = defaultFormatter,
    labelClassName,
    formatter,
    nameKey,
    color,
    ...restProps
  }: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> & {
    hideLabel?: boolean
    label?: string
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
    hideIndicator?: boolean
    labelClassName?: string
    labelFormatter?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((value: any, payload: TooltipPayload[]) => string | number | Snippet) | null
    formatter?: Snippet<
      [
        {
          value: unknown
          name: string
          item: TooltipPayload
          index: number
          payload: TooltipPayload[]
        },
      ]
    >
  } = $props()

  const chart = useChart()
  const layerChart = getChartContext()

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  function isTooltipValue(value: unknown): value is NonNullable<TooltipPayload['value']> {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      (typeof value === 'object' && value !== null && 'toLocaleString' in value)
    )
  }

  function getAccessorKey(value: unknown, fallback = 'value') {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      const key = value.find(item => typeof item === 'string')
      if (typeof key === 'string') return key
    }
    return fallback
  }

  function getValueAccessorKey() {
    return getAccessorKey(layerChart.valueAxis === 'y' ? layerChart.props.y : layerChart.props.x)
  }

  function getChartValue(data: unknown) {
    if (!isRecord(data)) return data

    try {
      return layerChart.valueAxis === 'y' ? layerChart.y(data) : layerChart.x(data)
    } catch {
      return data.value
    }
  }

  function getChartLabel(data: unknown) {
    if (!isRecord(data)) return undefined

    try {
      return layerChart.valueAxis === 'y' ? layerChart.x(data) : layerChart.y(data)
    } catch {
      return data.label
    }
  }

  function createFallbackTooltipPayload(data: unknown): TooltipPayload[] {
    const payload = isRecord(data) ? data : { value: data }
    const key = `${payload.key ?? nameKey ?? labelKey ?? getValueAccessorKey()}`
    const name =
      typeof payload.name === 'string'
        ? payload.name
        : typeof payload[key] === 'string'
          ? payload[key]
          : key
    const label = payload.label ?? getChartLabel(data)
    const value = getChartValue(data)

    return [
      {
        ...payload,
        key,
        name,
        label: label ?? name,
        value: isTooltipValue(value) ? value : undefined,
        payload,
      },
    ]
  }

  function createTooltipPayload(data: unknown): TooltipPayload[] {
    const payload = isRecord(data) ? data : { value: data }
    const seriesPayload = layerChart.tooltip.series
      .filter(item => item.visible)
      .map(item => {
        const key = `${item.key ?? nameKey ?? labelKey ?? 'value'}`
        const label = getChartLabel(data)
        return {
          key,
          name: item.label ?? key,
          label,
          value: isTooltipValue(item.value) ? item.value : undefined,
          color: item.color,
          payload,
          rawSeriesData: item.config,
        } satisfies TooltipPayload
      })

    return seriesPayload.length > 0 ? seriesPayload : createFallbackTooltipPayload(data)
  }

  function getFormattedLabel(payload: TooltipPayload[]): FormattedLabel {
    if (hideLabel || !payload.length) return null

    const item = payload[0]
    if (!item) return null

    const key = `${labelKey ?? item.label ?? item.name ?? 'value'}`

    const itemConfig = getPayloadConfigFromPayload(chart.config, item, key)

    const value =
      !labelKey && typeof label === 'string'
        ? (chart.config[label as keyof typeof chart.config]?.label ?? label)
        : (itemConfig?.label ?? item.label)

    if (value === undefined) return null
    if (!labelFormatter) {
      if (typeof value === 'function') return value as Snippet
      if (typeof value === 'string' || typeof value === 'number') return value
      return `${value}`
    }
    return labelFormatter(value, payload)
  }
</script>

{#snippet TooltipLabel(formattedLabel: FormattedLabel)}
  {#if formattedLabel}
    <div class={cn('font-medium', labelClassName)}>
      {#if typeof formattedLabel === 'function'}
        {@render formattedLabel()}
      {:else}
        {formattedLabel}
      {/if}
    </div>
  {/if}
{/snippet}

<TooltipPrimitive.Root variant="none">
  {#snippet children({ data })}
    {@const tooltipPayload = createTooltipPayload(data)}
    {@const formattedLabel = getFormattedLabel(tooltipPayload)}
    {@const nestLabel = tooltipPayload.length === 1 && indicator !== 'dot'}
    <div
      class={cn(
        'border-border/50 bg-background-l1 grid min-w-36 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
        className
      )}
      {...restProps}
    >
      {#if !nestLabel}
        {@render TooltipLabel(formattedLabel)}
      {/if}
      <div class="grid gap-1.5">
        {#each tooltipPayload as item, i (`${item.key ?? 'value'}-${i}`)}
          {@const key = `${nameKey || item.key || item.name || 'value'}`}
          {@const itemConfig = getPayloadConfigFromPayload(chart.config, item, key)}
          {@const indicatorColor = color || item.payload?.color || item.color}
          <div
            class={cn(
              '[&>svg]:text-foreground-l3 flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5',
              indicator === 'dot' && 'items-center'
            )}
          >
            {#if formatter && item.value !== undefined && item.name}
              {@render formatter({
                value: item.value,
                name: item.name,
                item,
                index: i,
                payload: tooltipPayload,
              })}
            {:else}
              {#if itemConfig?.icon}
                <itemConfig.icon />
              {:else if !hideIndicator}
                <div
                  style="--color-bg: {indicatorColor}; --color-border: {indicatorColor};"
                  class={cn('shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)', {
                    'size-2.5': indicator === 'dot',
                    'h-full w-1': indicator === 'line',
                    'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                    'my-0.5': nestLabel && indicator === 'dashed',
                  })}
                ></div>
              {/if}
              <div
                class={cn(
                  'flex flex-1 shrink-0 justify-between leading-none',
                  nestLabel ? 'items-end' : 'items-center'
                )}
              >
                <div class="grid gap-1.5">
                  {#if nestLabel}
                    {@render TooltipLabel(formattedLabel)}
                  {/if}
                  <span class="text-foreground-l3">
                    {itemConfig?.label || item.name}
                  </span>
                </div>
                {#if item.value !== undefined}
                  <span class="text-foreground-l0 font-mono font-medium tabular-nums">
                    {item.value.toLocaleString()}
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/snippet}
</TooltipPrimitive.Root>
