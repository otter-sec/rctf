import { Tooltip as TooltipPrimitive } from 'bits-ui'
import Content from './tooltip-content.svelte'
import Hover from './tooltip-hover.svelte'
import Trigger from './tooltip-trigger.svelte'
import Root from './tooltip.svelte'

const Provider = TooltipPrimitive.Provider
const Portal = TooltipPrimitive.Portal
const createTether = TooltipPrimitive.createTether

export {
  Root,
  Trigger,
  Content,
  Hover,
  Provider,
  Portal,
  createTether,
  //
  Root as Tooltip,
  Content as TooltipContent,
  Trigger as TooltipTrigger,
  Hover as TooltipHover,
  Provider as TooltipProvider,
  Portal as TooltipPortal,
  createTether as createTooltipTether,
}
