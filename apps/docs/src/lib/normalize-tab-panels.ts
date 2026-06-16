import type { Element, ElementContent } from "hast"
import { defineHastPlugin } from "satteri"

const isElement = (
  node: ElementContent | undefined,
  tagName?: string,
): node is Element =>
  node?.type === "element" &&
  (tagName === undefined || node.tagName === tagName)

const prop = (node: Readonly<Element>, name: string): string | undefined => {
  const value =
    node.properties?.[name] ??
    node.properties?.[name.replace(/-([a-z])/g, (_, char: string) =>
      char.toUpperCase(),
    )]
  return typeof value === "string" ? value : undefined
}

const directChildren = (
  node: Readonly<Element>,
  tagName?: string,
): Element[] =>
  (node.children ?? []).filter((child) => isElement(child, tagName))

const isCodeBlock = (node: Readonly<Element> | undefined): boolean =>
  isElement(node, "pre") && directChildren(node, "code").length > 0

const isCodeOnlyPanel = (panel: Readonly<Element>): boolean => {
  const children = directChildren(panel)
  return children.length === 1 && isCodeBlock(children[0])
}

export const normalizeTabPanels = defineHastPlugin({
  name: "normalize-tab-panels",
  element: {
    filter: ["tab-group"],
    visit(group, ctx) {
      const tablist = directChildren(group).find(
        (child) => prop(child, "role") === "tablist",
      )
      if (!tablist) return

      const tabs = directChildren(tablist, "button").filter(
        (child) => prop(child, "role") === "tab",
      )
      const panels = directChildren(group, "section")
      if (panels.length > 0 && panels.every(isCodeOnlyPanel)) {
        ctx.setProperty(group, "dataCodeTabs", "")
      }

      for (const [i, panel] of panels.entries()) {
        const tab = tabs[i]
        if (!tab) continue

        const tabId = prop(tab, "id")
        const panelId =
          prop(tab, "aria-controls") ??
          prop(panel, "id") ??
          (tabId ? `${tabId}-panel` : undefined)

        ctx.setProperty(panel, "role", "tabpanel")
        if (panelId) ctx.setProperty(panel, "id", panelId)
        if (tabId) ctx.setProperty(panel, "ariaLabelledby", tabId)
        ctx.setProperty(panel, "tabIndex", 0)
        ctx.setProperty(panel, "hidden", i > 0 ? true : null)
      }
    },
  },
})
