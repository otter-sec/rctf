import type { ElementContent } from "hast"
import { toHtml } from "hast-util-to-html"
import { h } from "hastscript"
import type { PhrasingContent } from "mdast"
import type {} from "mdast-util-to-hast"
import { inlineCodeNode, renderInlineText } from "../rich-text"
import {
  permissionNames,
  type ResolvedResponse,
  type ResolvedRoute,
} from "./registry"
import {
  dimPlaceholders,
  type ExampleValue,
  type FieldInfo,
  generateExample,
  type ResponseField,
  walkObjectShape,
  type ZodSchema,
} from "./schema"

const raw = (value: string): ElementContent => ({ type: "raw", value })
const tsAnnotated = (value: string): string => `${value}{:ts}`
const inlineCodeMarkup = (value: string): string => `\`${tsAnnotated(value)}\``

const METHOD_TONE = new Map<string, string>([
  ["GET", "cyan"],
  ["POST", "green"],
  ["PUT", "magenta"],
  ["PATCH", "orange"],
  ["DELETE", "red"],
  ["HEAD", "blue"],
  ["OPTIONS", "blue"],
])

function requiredMark(): ElementContent {
  return h(
    "span",
    { dataRequired: "", title: "required", ariaLabel: "required" },
    "*",
  )
}

async function fieldEntry(
  name: string,
  typeLabel: string,
  description: string | undefined,
  required: boolean,
): Promise<ElementContent> {
  const nameParts: ElementContent[] = [await inlineCodeNode(name)]
  if (required) nameParts.push(requiredMark())
  const term: ElementContent[] = [
    h("span", { dataFieldName: "" }, nameParts),
    h("span", { dataFieldType: "" }, [
      await inlineCodeNode(tsAnnotated(typeLabel)),
    ]),
  ]

  const children: ElementContent[] = [h("dt", term)]
  if (description) {
    const { html } = await renderInlineText(description)
    children.push(h("dd", [raw(html)]))
  }
  return h("div", { dataField: "" }, children)
}

function fieldListHtml(entries: ElementContent[]): string {
  return toHtml(h("dl", { dataFieldList: "" }, entries), {
    allowDangerousHtml: true,
  })
}

export async function requestFieldsHtml(fields: FieldInfo[]): Promise<string> {
  const entries: ElementContent[] = []
  for (const field of fields) {
    entries.push(
      await fieldEntry(
        field.name,
        field.typeLabel,
        field.description,
        field.required,
      ),
    )
  }
  return fieldListHtml(entries)
}

export async function responseFieldsHtml(
  fields: ResponseField[],
): Promise<string> {
  const entries: ElementContent[] = []
  for (const field of fields) {
    entries.push(
      await fieldEntry(field.path, field.typeLabel, field.description, false),
    )
  }
  return fieldListHtml(entries)
}

const ROUTE_META_EMPTY = new Set(["", "-", "none"])
const isEmptyMeta = (value: string): boolean =>
  ROUTE_META_EMPTY.has(value.trim().toLowerCase())

function deriveAuth(def: ResolvedRoute): string {
  if (def.serviceAuth) return "Service"
  if (def.authRequired) return "Required"
  if (def.optionalAuth) return "Optional"
  return "Public"
}

function permissionLabels(value: number): string {
  return permissionNames(value).map(inlineCodeMarkup).join(", ")
}

function deriveGate(def: ResolvedRoute): string {
  const parts: string[] = []
  if (def.onlyWhenStarted) parts.push("Started")
  if (def.onlyWhenNotFinished) parts.push("Before end")
  if (parts.length === 0) return "None"

  let gate = parts.join(" + ")
  if (typeof def.onlyWhenStartedPermissionsBypass === "number") {
    const labels = permissionLabels(def.onlyWhenStartedPermissionsBypass)
    if (labels) gate += ` (bypass ${labels})`
  }
  return gate
}

function derivePermissions(def: ResolvedRoute): string {
  if (typeof def.permissions !== "number") return "-"
  return permissionLabels(def.permissions) || "-"
}

export async function routeMetaHtml(
  def: ResolvedRoute,
  rateLimit: string | undefined,
): Promise<string> {
  const items = [
    { label: "Auth", value: deriveAuth(def), empty: "None" },
    { label: "Gate", value: deriveGate(def), empty: "None" },
    {
      label: "Permissions",
      value: derivePermissions(def),
      empty: "No extra permissions",
    },
    {
      label: "Captcha",
      value: def.captchaAction ? inlineCodeMarkup(def.captchaAction) : "-",
      empty: "No captcha",
    },
    { label: "Rate limit", value: rateLimit ?? "-", empty: "No rate limit" },
  ]

  const groups: ElementContent[] = []
  for (const item of items) {
    const empty = isEmptyMeta(item.value)
    const { html } = await renderInlineText(empty ? item.empty : item.value)
    groups.push(
      h("div", [
        h("dt", item.label),
        h("dd", empty ? { dataEmpty: "true" } : {}, [raw(html)]),
      ]),
    )
  }
  return toHtml(h("dl", { dataRouteMeta: "" }, groups), {
    allowDangerousHtml: true,
  })
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, "-$1").toLowerCase()
}

function buildObject(
  schema: ZodSchema | undefined,
  overrides: Record<string, ExampleValue> | undefined,
  filter?: string[],
): Record<string, ExampleValue> | undefined {
  const fields = walkObjectShape(schema)
  if (fields.length === 0) return undefined

  const out: Record<string, ExampleValue> = {}
  for (const field of fields) {
    if (filter && !filter.includes(field.name)) continue
    out[field.name] =
      overrides && Object.prototype.hasOwnProperty.call(overrides, field.name)
        ? overrides[field.name]
        : generateExample(field.schema, field.name)
  }
  return out
}

function substituteParams(
  path: string,
  params: Record<string, ExampleValue> | undefined,
): string {
  return path.replace(/:([a-zA-Z0-9_]+)/g, (_match, name: string) => {
    const override = params?.[name]
    return typeof override === "string"
      ? override
      : `<dim><${kebab(name)}></dim>`
  })
}

export function curlText(
  def: ResolvedRoute,
  baseUrl: string,
  pick: string[] | undefined,
  body: Record<string, ExampleValue> | undefined,
  query: Record<string, ExampleValue> | undefined,
  params: Record<string, ExampleValue> | undefined,
): string {
  const method = def.method.toUpperCase()
  const methodTone = METHOD_TONE.get(method) ?? "white"
  const path = substituteParams(def.path, params)
  const queryObj = buildObject(def.query, query)
  const queryString = queryObj
    ? `?${Object.entries(queryObj)
        .map(([key, value]) => `${key}=${String(dimPlaceholders(value))}`)
        .join("&")}`
    : ""
  const bodyObj = buildObject(def.body, body, pick)
  const isWriteMethod =
    method === "POST" || method === "PUT" || method === "PATCH"
  const isFormData = def.bodyFormat === "form-data"
  const hasBody = !!bodyObj && isWriteMethod
  const needsAuth =
    def.authRequired === true || def.optionalAuth === true || !!def.serviceAuth
  const tokenLabel =
    def.serviceAuth === "adminBot" ? "admin-bot-token" : "auth-token"
  const needsExplicitMethod =
    method !== "GET" && !(method === "POST" && hasBody)
  const fullUrl = `${baseUrl}/api${path}${queryString}`
  const bodyJson = bodyObj
    ? JSON.stringify(dimPlaceholders(bodyObj), null, 2)
    : ""
  const bodyIndented = bodyJson
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n")

  const lines = [`$ <red>curl</red> <dim>-sS</dim> <white>"${fullUrl}"</white>`]
  const add = (line: string): void => {
    lines[lines.length - 1] += " \\"
    lines.push(line)
  }

  if (needsExplicitMethod)
    add(`  <dim>-X</dim> <${methodTone}>${method}</${methodTone}>`)
  if (needsAuth) {
    add(
      `  <dim>-H</dim> <white>"Authorization: Bearer <dim><${tokenLabel}></dim>"</white>`,
    )
  }
  if (hasBody && isFormData && bodyObj) {
    for (const [key, value] of Object.entries(bodyObj)) {
      if (value === null) continue
      const fallback =
        key === "files"
          ? "@dist.zip"
          : key === "avatar"
            ? "@avatar.png"
            : String(value)
      const rendered = typeof value === "string" ? value : fallback
      add(`  <dim>-F</dim> <white>"${key}=${rendered}"</white>`)
    }
  } else if (hasBody) {
    add(`  <dim>--json</dim> '${bodyIndented}'`)
  }

  return lines.join("\n")
}

export function collectResponses(
  def: ResolvedRoute,
  extra: ResolvedResponse[],
): ResolvedResponse[] {
  const out: ResolvedResponse[] = []
  const seen = new Set<string>()
  for (const resp of [...def.goodResponses, ...def.badResponses, ...extra]) {
    if (seen.has(resp.kind)) continue
    seen.add(resp.kind)
    out.push(resp)
  }
  return out
}

export function responseExampleJson(resp: ResolvedResponse): string {
  const body: { [key: string]: ExampleValue } = {
    kind: resp.kind,
    message: resp.message,
  }
  if (resp.dataSchema)
    body.data = dimPlaceholders(generateExample(resp.dataSchema))
  return JSON.stringify(body, null, 2)
}

const INLINE_CODE_SPLIT = /`([^`]+?)(?:\{:([A-Za-z0-9_.-]+)\})?`/g

export function titlePhrasing(title: string): PhrasingContent[] {
  const nodes: PhrasingContent[] = []
  let lastIndex = 0
  for (const match of title.matchAll(INLINE_CODE_SPLIT)) {
    const index = match.index ?? 0
    const [source, code, lang] = match
    if (index > lastIndex)
      nodes.push({ type: "text", value: title.slice(lastIndex, index) })
    nodes.push({
      type: "inlineCode",
      value: lang ? `${code}{:${lang}}` : (code ?? ""),
    })
    lastIndex = index + source.length
  }
  if (lastIndex < title.length)
    nodes.push({ type: "text", value: title.slice(lastIndex) })
  return nodes
}
