import type { Code, Heading, Html, Paragraph } from 'mdast'
import type {} from 'mdast-util-to-hast'
import { defineMdastPlugin, type MdastNode } from 'satteri'
import { API_BASE_URL } from './config'
import { resolveResponse, resolveRoute, type ResolvedRoute } from './registry'
import {
  collectResponses,
  curlText,
  requestFieldsHtml,
  responseExampleJson,
  responseFieldsHtml,
  routeMetaHtml,
  titlePhrasing,
} from './render'
import {
  toExampleValue,
  walkObjectSchema,
  walkResponseSchema,
  type ExampleValue,
  type ZodSchema,
} from './schema'

type ContainerDirective = Extract<MdastNode, { type: 'containerDirective' }>
type LeafDirective = Extract<MdastNode, { type: 'leafDirective' }>
type ContainerDirectiveData = NonNullable<ContainerDirective['data']>
type DirectiveChildren = ReadonlyArray<ContainerDirective['children'][number]>
type AnyDirective = Readonly<ContainerDirective> | Readonly<LeafDirective>

type SourceName = 'body' | 'query' | 'params'
type ExampleObject = Record<string, ExampleValue>
interface ExampleInput {
  body?: ExampleObject
  query?: ExampleObject
  params?: ExampleObject
}

const CURL_META = 'title="Request" frame="terminal" showLineNumbers=false'

function attr(
  attrs: Record<string, string | null | undefined> | null | undefined,
  name: string
): string | undefined {
  const value = attrs?.[name]
  return typeof value === 'string' ? value : undefined
}

function listAttr(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    : []
}

function pickAttr(node: AnyDirective): string[] | undefined {
  const pick = listAttr(attr(node.attributes, 'pick'))
  return pick.length > 0 ? pick : undefined
}

function parseSource(value: string | undefined): SourceName {
  return value === 'query' || value === 'params' ? value : 'body'
}

function asExampleObject(value: ExampleValue): ExampleObject | undefined {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value
  return undefined
}

function resolveJsonAttr(value: string | undefined): ExampleObject | undefined {
  if (!value) return undefined
  return asExampleObject(toExampleValue(JSON.parse(decodeURIComponent(value))))
}

function sourceFromCode(node: Code): SourceName | undefined {
  const tokens = [node.lang ?? '', ...(node.meta?.split(/\s+/) ?? [])]
  for (const token of tokens) {
    const normalized = token
      .replace(/^source=/, '')
      .replace(/^title=/, '')
      .replace(/^["']|["']$/g, '')
    if (normalized === 'body' || normalized === 'query' || normalized === 'params')
      return normalized
  }
  return undefined
}

function exampleInput(
  attrs: Record<string, string | null | undefined> | null | undefined,
  children: DirectiveChildren
): ExampleInput {
  const input: ExampleInput = {
    body: resolveJsonAttr(attr(attrs, 'body')),
    query: resolveJsonAttr(attr(attrs, 'query')),
    params: resolveJsonAttr(attr(attrs, 'params')),
  }
  for (const child of children) {
    if (child.type !== 'code') continue
    const source = sourceFromCode(child)
    if (!source) continue
    input[source] = asExampleObject(toExampleValue(JSON.parse(child.value)))
  }
  return input
}

function headingNode(title: string): Heading {
  return { type: 'heading', depth: 3, children: titlePhrasing(title) }
}

function htmlNode(value: string): Html {
  return { type: 'html', value }
}

function buildCurlCode(
  node: AnyDirective,
  children: DirectiveChildren,
  pick: string[] | undefined
): Code {
  const def = resolveRoute(attr(node.attributes, 'def'))
  const baseUrl = attr(node.attributes, 'baseUrl') ?? API_BASE_URL
  const input = exampleInput(node.attributes, children)
  return {
    type: 'code',
    lang: 'json',
    meta: CURL_META,
    value: curlText(def, baseUrl, pick, input.body, input.query, input.params),
  }
}

function responseSyncKey(def: ResolvedRoute): string {
  const path = def.path.replace(/^\/v\d+(?=\/|$)/, '')
  return `api-responses:${def.method} ${path}`
}

const RESPONSE_SYNC_ALIASES: Readonly<Record<string, string>> = {
  goodAdminChallenge: 'goodAdminChallengeV2',
  goodAdminChallenges: 'goodAdminChallengesV2',
  goodChallenges: 'goodChallengesV2',
  goodChallengeSolves: 'goodChallengeSolvesV2',
  goodChallengeUpdate: 'goodChallengeUpdateV2',
  goodClientConfig: 'goodClientConfigV2',
  goodFilesUpload: 'goodFilesUploadV2',
  goodLeaderboard: 'goodLeaderboardV2',
  goodRegister: 'goodRegisterV2',
  goodUploadsQuery: 'goodUploadsQueryV2',
  goodUserData: 'goodUserDataV2',
  goodUserSelfData: 'goodUserSelfDataV2',
  goodUserUpdate: 'goodUserUpdateV2',
  badRecaptchaCode: 'badCaptcha',
}

function responseSyncId(kind: string): string {
  return RESPONSE_SYNC_ALIASES[kind] ?? kind
}

function buildResponseTabs(node: AnyDirective): ContainerDirective | undefined {
  const def = resolveRoute(attr(node.attributes, 'def'))
  const extra = listAttr(attr(node.attributes, 'extra')).map(name => resolveResponse(name))
  const responses = collectResponses(def, extra)
  if (responses.length === 0) return undefined

  const tabs: ContainerDirective[] = responses.map(resp => {
    const labelData = { directiveLabel: true } as ContainerDirectiveData
    const label: Paragraph = {
      type: 'paragraph',
      data: labelData,
      children: [
        {
          type: 'inlineCode',
          value: `<response>${resp.status} ${resp.kind}</response>`,
        },
      ],
    }
    const code: Code = {
      type: 'code',
      lang: 'json',
      meta: '',
      value: responseExampleJson(resp),
    }
    return {
      type: 'containerDirective',
      name: 'tab',
      attributes: { syncId: responseSyncId(resp.kind) },
      children: [label, code],
    }
  })
  return {
    type: 'containerDirective',
    name: 'tabs',
    attributes: { code: 'true', sync: responseSyncKey(def) },
    children: tabs,
  }
}

interface FieldsPlan {
  heading?: Heading
  list: Html
}

async function planRequestBody(node: Readonly<LeafDirective>): Promise<FieldsPlan | null> {
  const def = resolveRoute(attr(node.attributes, 'def'))
  const source = parseSource(attr(node.attributes, 'source'))
  const schema: ZodSchema | undefined =
    source === 'query' ? def.query : source === 'params' ? def.params : def.body
  const fields = walkObjectSchema(schema)
  if (fields.length === 0) return null
  const title = attr(node.attributes, 'title')
  return {
    heading: title ? headingNode(title) : undefined,
    list: htmlNode(await requestFieldsHtml(fields)),
  }
}

async function planResponseBody(node: Readonly<LeafDirective>): Promise<FieldsPlan | null> {
  const def = resolveRoute(attr(node.attributes, 'def'))
  const responseKind = attr(node.attributes, 'response')
  const resp = [...def.goodResponses, ...def.badResponses].find(
    candidate => candidate.kind === responseKind
  )
  const fields = resp?.dataSchema ? walkResponseSchema(resp.dataSchema) : []
  if (fields.length === 0) return null
  const title = attr(node.attributes, 'title')
  return {
    heading: title ? headingNode(title) : undefined,
    list: htmlNode(await responseFieldsHtml(fields)),
  }
}

// TODO: switch to `ctx.report` once the compile result exposes diagnostics
// (bruits/satteri#59 has the plumbing; tracked in bruits/satteri#87).
function warnDropped(syntax: string, name: string, error: unknown, fileURL: URL | undefined): void {
  const reason = error instanceof Error ? error.message : String(error)
  console.warn(
    `[markdown] api-reference directive ${syntax}${name} failed and was dropped from output: ${reason} (${fileURL?.pathname ?? 'unknown file'})`
  )
}

export function apiReferenceDirectives() {
  return defineMdastPlugin({
    name: 'api-reference-directives',
    async containerDirective(node, ctx) {
      try {
        switch (node.name) {
          case 'route-example': {
            const curl = buildCurlCode(node, node.children, pickAttr(node))
            const tabs = buildResponseTabs(node)
            ctx.insertBefore(node, curl)
            if (tabs) ctx.insertBefore(node, tabs)
            ctx.removeNode(node)
            return
          }
          case 'curl-example':
            return buildCurlCode(node, node.children, undefined)
        }
      } catch (error) {
        warnDropped(':::', node.name, error, ctx.fileURL)
        ctx.removeNode(node)
      }
    },
    async leafDirective(node, ctx) {
      try {
        switch (node.name) {
          case 'route-meta': {
            const def = resolveRoute(attr(node.attributes, 'def'))
            return htmlNode(await routeMetaHtml(def, attr(node.attributes, 'rateLimit')))
          }
          case 'request-body':
          case 'response-body': {
            const plan =
              node.name === 'request-body'
                ? await planRequestBody(node)
                : await planResponseBody(node)
            if (plan) {
              if (plan.heading) ctx.insertBefore(node, plan.heading)
              ctx.insertBefore(node, plan.list)
            }
            ctx.removeNode(node)
            return
          }
          case 'route-example': {
            const curl = buildCurlCode(node, [], pickAttr(node))
            const tabs = buildResponseTabs(node)
            ctx.insertBefore(node, curl)
            if (tabs) ctx.insertBefore(node, tabs)
            ctx.removeNode(node)
            return
          }
          case 'curl-example':
            return buildCurlCode(node, [], undefined)
        }
      } catch (error) {
        warnDropped('::', node.name, error, ctx.fileURL)
        ctx.removeNode(node)
      }
    },
  })
}
