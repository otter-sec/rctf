import type { ElementContent, Properties } from "hast"
import { select } from "hast-util-select"
import { h } from "hastscript"
import type {} from "mdast-util-to-hast"
import { defineMdastPlugin } from "satteri"
import {
  type ExpressiveCode,
  ExpressiveCodeBlock,
  type ExpressiveCodeTheme,
} from "satteri-expressive-code"
import {
  parseCodeAnnotations,
  stripCodeAnnotationTags,
} from "../code-annotations"
import { loadIcon } from "../icons"
import { ecRenderer } from "./config"

const ANNOTATION = /^(.+?)\{:([^}]+)\}$/
const PLACEHOLDER = /<[a-z][a-z0-9_-]*>/g

type Annotation =
  | { kind: "lang"; code: string; lang: string }
  | { kind: "scope"; code: string; scope: string }
  | { kind: "path"; code: string; path: "folder" | "file" }

function parseAnnotation(value: string): Annotation | null {
  const match = ANNOTATION.exec(value)
  if (!match) return null
  const [, code, tag] = match
  if (!code || tag === ".") return null
  if (tag === "dir" || tag === "file")
    return { kind: "path", code, path: tag === "dir" ? "folder" : "file" }
  return tag.startsWith(".")
    ? { kind: "scope", code, scope: tag.slice(1) }
    : { kind: "lang", code, lang: tag }
}

const raw = (value: string): ElementContent => ({ type: "raw", value })

const pathIcons: Record<string, string> = {
  folder: loadIcon("code/folder"),
  file: loadIcon("code/file"),
}

function pathChildren(code: string, kind: "folder" | "file"): ElementContent[] {
  const children: ElementContent[] = [raw(pathIcons[kind])]
  let last = 0
  for (const match of code.matchAll(PLACEHOLDER)) {
    const start = match.index ?? 0
    if (start > last)
      children.push({ type: "text", value: code.slice(last, start) })
    children.push(h("span", { className: ["code-placeholder"] }, match[0]))
    last = start + match[0].length
  }
  if (last < code.length)
    children.push({ type: "text", value: code.slice(last) })
  return children
}

async function highlightLanguage(
  ec: ExpressiveCode,
  code: string,
  lang: string,
): Promise<ElementContent[]> {
  const block = new ExpressiveCodeBlock({ code, language: lang })
  const { renderedGroupAst } = await ec.render(block)
  const tokens = select(".ec-line .code", renderedGroupAst)?.children
  return tokens ?? [{ type: "text", value: code }]
}

function highlightScope(
  ec: ExpressiveCode,
  code: string,
  scope: string,
): ElementContent[] {
  const [light, dark] = ec.styleVariants
  const c0 = resolveScopeColor(light.theme, scope)
  const c1 = resolveScopeColor(dark.theme, scope)
  return [h("span", { style: `--0:${c0};--1:${c1}` }, code)]
}

function resolveScopeColor(theme: ExpressiveCodeTheme, scope: string): string {
  const best = (theme.settings ?? [])
    .flatMap((rule) =>
      (rule.scope ?? []).map((s) => ({ s, fg: rule.settings.foreground })),
    )
    .filter(({ s, fg }) => fg && (scope === s || scope.startsWith(`${s}.`)))
    .sort((a, b) => b.s.length - a.s.length)[0]
  return best?.fg ?? theme.fg
}

export const inlineExpressiveCode = defineMdastPlugin({
  name: "inline-expressive-code",
  async inlineCode(node, ctx) {
    const annotation = parseAnnotation(node.value)
    let code = annotation?.code ?? node.value
    const command = code.startsWith("$ ") && code.length > 2
    if (command) code = code.slice(2)
    const tones = parseCodeAnnotations(code)

    if (!annotation && !command && !tones) return

    try {
      const properties: Properties = {}
      let children: ElementContent[]

      if (tones) {
        children = tones
      } else if (annotation?.kind === "path") {
        children = pathChildren(code, annotation.path)
        properties.dataCodePath = annotation.path
      } else if (annotation?.kind === "lang") {
        const { ec } = await ecRenderer
        children = await highlightLanguage(ec, code, annotation.lang)
        properties.dataEc = ""
        properties.dataLanguage = annotation.lang
      } else if (annotation?.kind === "scope") {
        const { ec } = await ecRenderer
        children = highlightScope(ec, code, annotation.scope)
        properties.dataEc = ""
      } else {
        children = [{ type: "text", value: code }]
      }

      if (command) {
        const copy = stripCodeAnnotationTags(code)
        ctx.setProperty(node, "value", copy)
        ctx.setProperty(node, "data", {
          hName: "copy-command",
          hProperties: {
            role: "button",
            tabIndex: 0,
            dataCopy: copy,
            title: `Copy: ${copy}`,
            ariaLabel: `Copy command: ${copy}`,
          },
          hChildren: [
            h("code", properties, [
              h("span", { className: ["shell-prompt"], ariaHidden: "true" }),
              ...children,
            ]),
          ],
        })
        return
      }

      ctx.setProperty(
        node,
        "value",
        tones ? stripCodeAnnotationTags(code) : code,
      )
      ctx.setProperty(node, "data", {
        hName: "code",
        hProperties: properties,
        hChildren: children,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      ctx.report({
        message: `inline-expressive-code: failed on \`${node.value}\`: ${reason}`,
        node,
        severity: "warning",
      })
    }
  },
})
