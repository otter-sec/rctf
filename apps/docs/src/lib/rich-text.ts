import type { ElementContent, Root } from "hast"
import { toHtml } from "hast-util-to-html"
import { h } from "hastscript"
import {
  CODE_ANNOTATION_TAGS,
  stripCodeAnnotationTags,
} from "./code-annotations"
import { renderInlineCodeValue } from "./expressive-code/inline"

const INLINE_CODE_PATTERN = "`([^`]+?)(?:\\{:([A-Za-z0-9_.-]+)\\})?`"
const inlineCodeRe = () => new RegExp(INLINE_CODE_PATTERN, "g")
const INLINE_ANNOTATION_RE = /\{:[^}]+\}$/
const annotationTagRe = () =>
  new RegExp(`<(${CODE_ANNOTATION_TAGS.join("|")})>[\\s\\S]*?<\\/\\1>`, "g")

const serialize = (children: ElementContent[]) =>
  toHtml({ type: "root", children } satisfies Root, {
    allowDangerousHtml: true,
  })

const textHtml = (value: string) => serialize([{ type: "text", value }])

function plainCodeValue(value: string): string {
  const code = stripCodeAnnotationTags(value.replace(INLINE_ANNOTATION_RE, ""))
  return code.startsWith("$ ") && code.length > 2 ? code.slice(2) : code
}

export function plainInlineText(value: string): string {
  return stripCodeAnnotationTags(
    value.replace(inlineCodeRe(), (_, code: string) => plainCodeValue(code)),
  )
}

export async function inlineCodeNode(value: string): Promise<ElementContent> {
  try {
    const rendered = await renderInlineCodeValue(value)
    if (rendered) {
      return rendered.command
        ? h(
            "copy-command",
            {
              role: "button",
              tabIndex: 0,
              dataCopy: rendered.copy ?? rendered.value,
              title: `Copy: ${rendered.copy ?? rendered.value}`,
              ariaLabel: `Copy command: ${rendered.copy ?? rendered.value}`,
            },
            [
              h("code", rendered.properties, [
                h("span", {
                  className: ["shell-prompt"],
                  ariaHidden: "true",
                }),
                ...rendered.children,
              ]),
            ],
          )
        : h("code", rendered.properties, rendered.children)
    }
  } catch {}

  return h("code", plainCodeValue(value))
}

async function inlineCodeHtml(value: string): Promise<string> {
  return serialize([await inlineCodeNode(value)])
}

async function renderTextSegment(value: string): Promise<string> {
  const parts: string[] = []
  let lastIndex = 0
  const re = annotationTagRe()

  for (const match of value.matchAll(re)) {
    const index = match.index ?? 0
    if (index > lastIndex) parts.push(textHtml(value.slice(lastIndex, index)))
    parts.push(await inlineCodeHtml(match[0]))
    lastIndex = index + match[0].length
  }

  if (lastIndex < value.length) parts.push(textHtml(value.slice(lastIndex)))
  return parts.join("")
}

export async function renderInlineText(value: string): Promise<{ html: string }> {
  const parts: string[] = []
  let lastIndex = 0

  for (const match of value.matchAll(inlineCodeRe())) {
    const index = match.index ?? 0
    const [source, code, suffix] = match
    if (index > lastIndex) {
      parts.push(await renderTextSegment(value.slice(lastIndex, index)))
    }
    parts.push(await inlineCodeHtml(suffix ? `${code}{:${suffix}}` : code))
    lastIndex = index + source.length
  }

  if (lastIndex < value.length) {
    parts.push(await renderTextSegment(value.slice(lastIndex)))
  }

  return {
    html: parts.join(""),
  }
}
