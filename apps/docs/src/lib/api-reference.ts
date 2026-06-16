import * as Types from "@rctf/types"
import { defineMdastPlugin } from "satteri"
import {
  dimPlaceholders,
  generateExample,
  requestFieldDescription,
  responseFieldDescription,
  walkObjectSchema,
  walkResponseSchema,
} from "./route-introspect"

type Attrs = Record<string, string | null | undefined>
type SourceName = "body" | "query" | "params"
type DirectiveChild = {
  type: string
  lang?: string | null
  meta?: string | null
  value?: string
}
type RouteDef = {
  method?: string
  path?: string
  body?: unknown
  query?: unknown
  params?: unknown
  bodyFormat?: string
  authRequired?: boolean
  optionalAuth?: boolean
  serviceAuth?: string | boolean
  onlyWhenStarted?: boolean
  onlyWhenNotFinished?: boolean
  onlyWhenStartedPermissionsBypass?: number
  permissions?: number
  captchaAction?: string
  goodResponses?: ResponseDef[]
  badResponses?: ResponseDef[]
}
type ResponseDef = {
  kind: string
  status: number
  message: string
  dataSchema?: unknown
}

const typeExports = Types as unknown as Record<string, unknown>
const localRouteExports: Record<string, RouteDef> = {
  AnalyticsScriptRoute: {
    path: "/v2/integrations/analytics/script",
    method: "GET",
    authRequired: false,
    goodResponses: [],
    badResponses: [],
  },
}
const methodToneTags = new Map([
  ["GET", "cyan"],
  ["POST", "green"],
  ["PUT", "magenta"],
  ["PATCH", "orange"],
  ["DELETE", "red"],
  ["HEAD", "blue"],
  ["OPTIONS", "blue"],
])

const attr = (attrs: Attrs | null | undefined, name: string): string | undefined => {
  const value = attrs?.[name]
  return typeof value === "string" ? value : undefined
}

const listAttr = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const resolveExport = <T>(name: string | undefined, label: string): T => {
  if (!name) throw new Error(`Missing ${label}`)
  const value = typeExports[name] ?? localRouteExports[name]
  if (!value) throw new Error(`Unknown @rctf/types export: ${name}`)
  return value as T
}

const resolveJson = (value: string | undefined): Record<string, unknown> | undefined => {
  if (!value) return undefined
  return JSON.parse(decodeURIComponent(value)) as Record<string, unknown>
}

const sourceNames = new Set<SourceName>(["body", "query", "params"])

function sourceFromCode(node: DirectiveChild): SourceName | undefined {
  const tokens = [node.lang, ...(node.meta?.split(/\s+/) ?? [])].filter(Boolean)
  for (const token of tokens) {
    const normalized = token
      ?.replace(/^source=/, "")
      .replace(/^title=/, "")
      .replace(/^["']|["']$/g, "")
    if (normalized && sourceNames.has(normalized as SourceName)) {
      return normalized as SourceName
    }
  }
  return undefined
}

function parseJsonBlock(node: DirectiveChild, source: SourceName): Record<string, unknown> {
  if (typeof node.value !== "string") {
    throw new Error(`Missing ${source} JSON block value`)
  }
  return JSON.parse(node.value) as Record<string, unknown>
}

function exampleInput(
  attrs: Attrs | null | undefined,
  children: DirectiveChild[] | null | undefined,
): Record<SourceName, Record<string, unknown> | undefined> {
  const input = {
    body: resolveJson(attr(attrs, "body")),
    query: resolveJson(attr(attrs, "query")),
    params: resolveJson(attr(attrs, "params")),
  }

  for (const child of children ?? []) {
    if (child.type !== "code") continue
    const source = sourceFromCode(child)
    if (!source) continue
    input[source] = parseJsonBlock(child, source)
  }

  return input
}

const escapeTableCell = (value: string): string =>
  value.replaceAll("\n", " ").replaceAll("|", "\\|")

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const inlineCode = (value: string, lang?: string): string =>
  `\`${value}${lang ? `{:${lang}}` : ""}\``

const heading = (title: string | undefined): string => (title ? `### ${title}\n\n` : "")

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.map(escapeTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => escapeTableCell(cell)).join(" | ")} |`),
  ].join("\n")
}

function permissionNames(value: number): string[] {
  const permissions = typeExports.Permissions as Record<string, unknown> | undefined
  if (!permissions) return []

  const names: string[] = []
  for (const [key, bit] of Object.entries(permissions)) {
    if (typeof bit === "number" && (value & bit) === bit) {
      names.push(inlineCode(key, "ts"))
    }
  }
  return names
}

function deriveAuth(def: RouteDef): string {
  if (def.serviceAuth) return "Service"
  if (def.authRequired) return "Required"
  if (def.optionalAuth) return "Optional"
  return "Public"
}

function deriveGate(def: RouteDef): string {
  const parts: string[] = []
  if (def.onlyWhenStarted) parts.push("Started")
  if (def.onlyWhenNotFinished) parts.push("Before end")
  if (parts.length === 0) return "None"

  let gate = parts.join(" + ")
  const bypass = def.onlyWhenStartedPermissionsBypass
  if (typeof bypass === "number") {
    const names = permissionNames(bypass)
    if (names.length > 0) gate += ` (bypass ${names.join(", ")})`
  }
  return gate
}

function derivePermissions(def: RouteDef): string {
  if (typeof def.permissions !== "number") return "-"
  const names = permissionNames(def.permissions)
  return names.length > 0 ? names.join(", ") : "-"
}

function isEmptyRouteMetaValue(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === "" || normalized === "-" || normalized === "none"
}

function renderInlineDescription(value: string): string {
  let html = ""
  let last = 0

  for (const match of value.matchAll(/`([^`]+)`/g)) {
    const index = match.index ?? 0
    const rawCode = match[1] ?? ""
    html += escapeHtml(value.slice(last, index))
    html += `<code>${escapeHtml(rawCode.replace(/\{:[^}]+\}$/, ""))}</code>`
    last = index + match[0].length
  }

  html += escapeHtml(value.slice(last))
  return html
}

function routeMetaHtml(def: RouteDef, rateLimit: string | undefined): string {
  const items = [
    { label: "Auth", value: deriveAuth(def), emptyValue: "None" },
    { label: "Gate", value: deriveGate(def), emptyValue: "None" },
    {
      label: "Permissions",
      value: derivePermissions(def),
      emptyValue: "No extra permissions",
    },
    {
      label: "Captcha",
      value: def.captchaAction ? inlineCode(def.captchaAction, "ts") : "-",
      emptyValue: "No captcha",
    },
    {
      label: "Rate limit",
      value: rateLimit ?? "-",
      emptyValue: "No rate limit",
    },
  ]

  return [
    '<dl data-route-meta>',
    ...items.map((item) => {
      const empty = isEmptyRouteMetaValue(item.value)
      const value = empty ? item.emptyValue : item.value
      return [
        "<div>",
        `<dt>${escapeHtml(item.label)}</dt>`,
        `<dd${empty ? ' data-empty="true"' : ""}>${renderInlineDescription(value)}</dd>`,
        "</div>",
      ].join("")
    }),
    "</dl>",
  ].join("")
}

function requestBodyMarkdown(
  def: RouteDef,
  source: "body" | "query" | "params",
  title: string | undefined,
): string {
  const fields = walkObjectSchema(def[source])
  if (fields.length === 0) return ""

  const rows = fields.map((field) => [
    inlineCode(field.name) + (field.required ? " *" : ""),
    inlineCode(field.typeLabel, "ts"),
    field.required ? "Yes" : "No",
    field.description ?? requestFieldDescription(field.name, source),
  ])
  return `${heading(title)}${table(["Field", "Type", "Required", "Description"], rows)}`
}

function responseBodyMarkdown(
  def: RouteDef,
  response: string | undefined,
  title: string | undefined,
): string {
  const allResponses = [...(def.goodResponses ?? []), ...(def.badResponses ?? [])]
  const resp = allResponses.find((candidate) => candidate.kind === response)
  const fields = resp ? walkResponseSchema(resp.dataSchema) : []
  if (fields.length === 0) return ""

  const rows = fields.map((field) => [
    inlineCode(field.path),
    inlineCode(field.typeLabel, "ts"),
    field.description ?? responseFieldDescription(field.path),
  ])
  return `${heading(title)}${table(["Field", "Type", "Description"], rows)}`
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, "-$1").toLowerCase()
}

function buildObject(
  schema: unknown,
  overrides: Record<string, unknown> | undefined,
  filter?: string[],
): Record<string, unknown> | undefined {
  const fields = walkObjectSchema(schema)
  if (fields.length === 0) return undefined

  const out: Record<string, unknown> = {}
  for (const field of fields) {
    if (filter && !filter.includes(field.name)) continue
    out[field.name] =
      overrides && Object.prototype.hasOwnProperty.call(overrides, field.name)
        ? overrides[field.name]
        : generateExample(field.schema, field.name)
  }
  return out
}

function substituteParams(path: string, params: Record<string, unknown> | undefined): string {
  return path.replace(/:([a-zA-Z0-9_]+)/g, (_, name: string) => {
    const override = params?.[name]
    return typeof override === "string" ? override : `<dim><${kebab(name)}></dim>`
  })
}

function curlMarkdown(
  def: RouteDef,
  baseUrl: string,
  pick: string[] | undefined,
  body: Record<string, unknown> | undefined,
  query: Record<string, unknown> | undefined,
  params: Record<string, unknown> | undefined,
): string {
  const method = (def.method ?? "GET").toUpperCase()
  const methodTone = methodToneTags.get(method) ?? "white"
  const path = substituteParams(def.path ?? "", params)
  const queryObj = buildObject(def.query, query)
  const queryString = queryObj
    ? `?${Object.entries(queryObj)
        .map(([key, value]) => `${key}=${String(dimPlaceholders(value))}`)
        .join("&")}`
    : ""
  const bodyObj = buildObject(def.body, body, pick)
  const isWriteMethod = method === "POST" || method === "PUT" || method === "PATCH"
  const isFormData = def.bodyFormat === "form-data"
  const hasBody = !!bodyObj && isWriteMethod
  const needsAuth = def.authRequired === true || def.optionalAuth === true || !!def.serviceAuth
  const tokenLabel = def.serviceAuth === "adminBot" ? "admin-bot-token" : "auth-token"
  const needsExplicitMethod = method !== "GET" && !(method === "POST" && hasBody)
  const fullUrl = `${baseUrl}/api${path}${queryString}`
  const bodyJson = bodyObj ? JSON.stringify(dimPlaceholders(bodyObj), null, 2) : ""
  const bodyIndented = bodyJson
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n")

  const lines = [`$ <red>curl</red> <dim>-sS</dim> <white>"${fullUrl}"</white>`]
  const add = (line: string): void => {
    lines[lines.length - 1] += " \\"
    lines.push(line)
  }

  if (needsExplicitMethod) add(`  <dim>-X</dim> <${methodTone}>${method}</${methodTone}>`)
  if (needsAuth) {
    add(`  <dim>-H</dim> <white>"Authorization: Bearer <dim><${tokenLabel}></dim>"</white>`)
  }
  if (hasBody && isFormData && bodyObj) {
    for (const [key, value] of Object.entries(bodyObj)) {
      if (value === null || value === undefined) continue
      const fallback = key === "files" ? "@dist.zip" : key === "avatar" ? "@avatar.png" : String(value)
      const rendered = typeof value === "string" ? value : fallback
      add(`  <dim>-F</dim> <white>"${key}=${rendered}"</white>`)
    }
  } else if (hasBody) {
    add(`  <dim>--json</dim> '${bodyIndented}'`)
  }

  return `\`\`\`json title="Request" frame="terminal" showLineNumbers=false\n${lines.join("\n")}\n\`\`\``
}

function exampleData(resp: ResponseDef): unknown | undefined {
  return resp.dataSchema ? dimPlaceholders(generateExample(resp.dataSchema)) : undefined
}

function responseExamplesMarkdown(def: RouteDef, extra: ResponseDef[]): string {
  const responses: ResponseDef[] = []
  const seen = new Set<string>()
  for (const resp of [...(def.goodResponses ?? []), ...(def.badResponses ?? []), ...extra]) {
    if (seen.has(resp.kind)) continue
    seen.add(resp.kind)
    responses.push(resp)
  }

  if (responses.length === 0) return ""

  const tabs = responses.map((resp) => {
    const body: Record<string, unknown> = {
      kind: resp.kind,
      message: resp.message,
    }
    const data = exampleData(resp)
    if (data !== undefined) body.data = data
    const label = `${resp.status} ${resp.kind}`
    return [
      `:::tab[${label}]`,
      "",
      "```json",
      JSON.stringify(body, null, 2),
      "```",
      "",
      ":::",
    ].join("\n")
  })

  return ["::::tabs{code=true}", "", ...tabs.flatMap((tab) => [tab, ""]), "::::"].join("\n")
}

function routeExampleMarkdown(
  attrs: Attrs | null | undefined,
  children?: DirectiveChild[] | null,
): string {
  const def = resolveExport<RouteDef>(attr(attrs, "def"), "route definition")
  const extra = listAttr(attr(attrs, "extra")).map((name) => resolveExport<ResponseDef>(name, "response"))
  const pick = listAttr(attr(attrs, "pick"))
  const input = exampleInput(attrs, children)
  return [
    curlMarkdown(
      def,
      attr(attrs, "baseUrl") ?? "https://rctf-new-dev.es3n1n.io",
      pick.length > 0 ? pick : undefined,
      input.body,
      input.query,
      input.params,
    ),
    responseExamplesMarkdown(def, extra),
  ]
    .filter(Boolean)
    .join("\n\n")
}

export const apiReferenceDirectives = defineMdastPlugin({
  name: "api-reference-directives",
  containerDirective(node, ctx) {
    try {
      switch (node.name) {
        case "route-example":
          return {
            raw: routeExampleMarkdown(node.attributes, node.children as DirectiveChild[]),
          }
        case "curl-example": {
          const def = resolveExport<RouteDef>(attr(node.attributes, "def"), "route definition")
          const input = exampleInput(node.attributes, node.children as DirectiveChild[])
          return {
            raw: curlMarkdown(
              def,
              attr(node.attributes, "baseUrl") ?? "https://rctf-new-dev.es3n1n.io",
              undefined,
              input.body,
              input.query,
              input.params,
            ),
          }
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      ctx.report({
        message: `api-reference-directives: failed to render ${node.name}: ${reason}`,
        node,
        severity: "error",
      })
      return {
        raw: `:::caution[API reference directive failed]\n${reason}\n:::`,
      }
    }
  },
  leafDirective(node, ctx) {
    try {
      switch (node.name) {
        case "route-meta": {
          const def = resolveExport<RouteDef>(attr(node.attributes, "def"), "route definition")
          return { rawHtml: routeMetaHtml(def, attr(node.attributes, "rateLimit")) }
        }
        case "request-body": {
          const def = resolveExport<RouteDef>(attr(node.attributes, "def"), "route definition")
          const source = (attr(node.attributes, "source") ?? "body") as "body" | "query" | "params"
          return {
            raw: requestBodyMarkdown(def, source, attr(node.attributes, "title")),
          }
        }
        case "response-body": {
          const def = resolveExport<RouteDef>(attr(node.attributes, "def"), "route definition")
          return {
            raw: responseBodyMarkdown(
              def,
              attr(node.attributes, "response"),
              attr(node.attributes, "title"),
            ),
          }
        }
        case "route-example":
          return { raw: routeExampleMarkdown(node.attributes) }
        case "curl-example": {
          const def = resolveExport<RouteDef>(attr(node.attributes, "def"), "route definition")
          const input = exampleInput(node.attributes, null)
          return {
            raw: curlMarkdown(
              def,
              attr(node.attributes, "baseUrl") ?? "https://rctf-new-dev.es3n1n.io",
              undefined,
              input.body,
              input.query,
              input.params,
            ),
          }
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      ctx.report({
        message: `api-reference-directives: failed to render ${node.name}: ${reason}`,
        node,
        severity: "error",
      })
      return {
        raw: `:::caution[API reference directive failed]\n${reason}\n:::`,
      }
    }
  },
})
