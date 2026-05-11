import { Tooltip as TooltipPrimitive } from 'bits-ui'
import Content from './tooltip-content.svelte'
import Trigger from './tooltip-trigger.svelte'

const Root = TooltipPrimitive.Root
const Provider = TooltipPrimitive.Provider
const Portal = TooltipPrimitive.Portal
const createTether = TooltipPrimitive.createTether

export {
  Root,
  Trigger,
  Content,
  Provider,
  Portal,
  createTether,
  //
  Root as Tooltip,
  Content as TooltipContent,
  Trigger as TooltipTrigger,
  Provider as TooltipProvider,
  Portal as TooltipPortal,
  createTether as createTooltipTether,
}
