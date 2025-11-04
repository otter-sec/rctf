import { z } from 'zod'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type StatusCode = number

export interface Model<TSchema extends z.ZodTypeAny> {
  readonly name: string
  readonly schema: TSchema
  parse(input: unknown): z.output<TSchema>
  safeParse(
    input: unknown
  ): z.SafeParseReturnType<z.input<TSchema>, z.output<TSchema>>
}

export type InferModel<TModel extends Model<z.ZodTypeAny>> = z.output<
  TModel['schema']
>

export type SchemaLike = z.ZodTypeAny | Model<any>

const schemaFrom = (schema: SchemaLike): z.ZodTypeAny =>
  'schema' in schema ? schema.schema : schema

export interface ModelOptions {
  description?: string
}

export const createModel = <TSchema extends z.ZodTypeAny>(
  name: string,
  schema: TSchema,
  options?: ModelOptions
): Model<TSchema> => {
  const describedSchema = schema.describe(options?.description ?? name)

  return {
    name,
    schema: describedSchema,
    parse: value => describedSchema.parse(value),
    safeParse: value => describedSchema.safeParse(value),
  }
}

export const model = <TShape extends z.ZodRawShape>(
  name: string,
  shape: TShape,
  options?: ModelOptions
) => createModel(name, z.object(shape), options)

export const scalar = <TSchema extends z.ZodTypeAny>(
  name: string,
  schema: TSchema,
  options?: ModelOptions
) => createModel(name, schema, options)

export interface ResponseDefinition<
  TKind extends string,
  TDataSchema extends z.ZodTypeAny | undefined = undefined
> {
  readonly kind: TKind
  readonly status: StatusCode
  readonly message: string
  readonly dataSchema: TDataSchema
  readonly schema: z.ZodTypeAny
}

type ResponseOptions<TDataSchema extends z.ZodTypeAny | undefined> =
  TDataSchema extends z.ZodTypeAny
    ? {
        status: StatusCode
        message: string
        data: TDataSchema
      }
    : {
        status: StatusCode
        message: string
      }

export const response = <
  TKind extends string,
  TDataSchema extends z.ZodTypeAny | undefined = undefined
>(
  kind: TKind,
  options: ResponseOptions<TDataSchema>
): ResponseDefinition<TKind, TDataSchema> => {
  const base = {
    kind: z.literal(kind),
    message: z.literal(options.message),
  }

  const hasData = 'data' in options
  const dataSchema = hasData
    ? (options as { data: z.ZodTypeAny }).data
    : undefined

  const schema = z.object({
    ...base,
    data: dataSchema ?? z.null(),
  })

  return {
    kind,
    status: options.status,
    message: options.message,
    dataSchema: dataSchema as TDataSchema,
    schema,
  }
}

export type ResponseResult<
  TDefinition extends ResponseDefinition<string, z.ZodTypeAny | undefined>
> = {
  status: TDefinition['status']
  body: z.infer<TDefinition['schema']>
  definition: TDefinition
}

type ResponseHelper<
  TDefinition extends ResponseDefinition<string, z.ZodTypeAny | undefined>
> = TDefinition['dataSchema'] extends z.ZodTypeAny
  ? (
      payload: z.input<NonNullable<TDefinition['dataSchema']>>
    ) => ResponseResult<TDefinition>
  : () => ResponseResult<TDefinition>

type ResponseHelpers<
  TResponses extends readonly ResponseDefinition<
    string,
    z.ZodTypeAny | undefined
  >[]
> = {
  [R in TResponses[number] as R['kind']]: ResponseHelper<R>
}

export interface RouteDefinition<
  TMethod extends HttpMethod,
  TBody extends SchemaLike | undefined,
  TResponses extends readonly ResponseDefinition<
    string,
    z.ZodTypeAny | undefined
  >[]
> {
  readonly method: TMethod
  readonly path: string
  readonly body: TBody
  readonly responses: TResponses
  readonly authRequired: boolean
}

// FIXME(es3n1n): the sequence of next N functions looks actually horrible
export function defineRoute<
  TMethod extends HttpMethod,
  TResponses extends readonly ResponseDefinition<
    string,
    z.ZodTypeAny | undefined
  >[]
>(definition: {
  method: TMethod
  path: string
  responses: TResponses
  authRequired?: boolean
}): RouteDefinition<TMethod, undefined, TResponses>

export function defineRoute<
  TMethod extends HttpMethod,
  TBody extends SchemaLike,
  TResponses extends readonly ResponseDefinition<
    string,
    z.ZodTypeAny | undefined
  >[]
>(definition: {
  method: TMethod
  path: string
  body: TBody
  responses: TResponses
  authRequired?: boolean
}): RouteDefinition<TMethod, TBody, TResponses>

export function defineRoute(definition: {
  method: HttpMethod
  path: string
  body?: SchemaLike
  responses: readonly ResponseDefinition<string, z.ZodTypeAny | undefined>[]
  authRequired?: boolean
}): RouteDefinition<
  HttpMethod,
  SchemaLike | undefined,
  readonly ResponseDefinition<string, z.ZodTypeAny | undefined>[]
> {
  return {
    method: definition.method,
    path: definition.path,
    body: definition.body ?? undefined,
    responses: definition.responses,
    authRequired: definition.authRequired ?? false,
  }
}

export type AnyRouteDefinition = RouteDefinition<
  HttpMethod,
  SchemaLike | undefined,
  readonly ResponseDefinition<string, z.ZodTypeAny | undefined>[]
>

type UnderlyingSchema<T extends SchemaLike> = T extends Model<infer TSchema>
  ? TSchema
  : T

export type RouteBody<
  TRoute extends RouteDefinition<HttpMethod, SchemaLike | undefined, any>
> = [TRoute['body']] extends [SchemaLike]
  ? z.output<UnderlyingSchema<TRoute['body']>>
  : undefined

export interface RouteHandlerContext<TContext> {
  context: TContext
  auth?: unknown
}

export type RouteHandler<
  TContext,
  TRoute extends RouteDefinition<HttpMethod, SchemaLike | undefined, any>
> = (
  responders: ResponseHelpers<TRoute['responses']>,
  body: RouteBody<TRoute>,
  context: RouteHandlerContext<TContext>
) => RouteHandlerResult<TRoute> | Promise<RouteHandlerResult<TRoute>>

export type RouteHandlerResult<
  TRoute extends RouteDefinition<HttpMethod, SchemaLike | undefined, any>
> = ResponseResult<TRoute['responses'][number]>

// FIXME(es3n1n): Not sure about the actual functions we will need from this
export interface RouteRuntime<
  TContext,
  TResult,
  TRoute extends RouteDefinition<HttpMethod, SchemaLike | undefined, any>
> {
  readBody?: (context: TContext) => Promise<unknown>
  handleMalformedBody?: (
    context: TContext,
    error: unknown
  ) => TResult | Promise<TResult>
  handleValidationError?: (
    context: TContext,
    error: z.ZodError<unknown>
  ) => TResult | Promise<TResult>
  ensureAuth?: (context: TContext) => Promise<unknown>
  send: (
    context: TContext,
    result: RouteHandlerResult<TRoute>
  ) => TResult | Promise<TResult>
}

export type RouteExecutor<TContext, TResult> = (
  context: TContext
) => Promise<TResult>

export interface DeclaredRoute<
  TContext,
  TResult,
  TRoute extends RouteDefinition<HttpMethod, SchemaLike | undefined, any>
> {
  readonly definition: TRoute
  readonly handler: RouteHandler<TContext, TRoute>
  createHandler(
    runtime: RouteRuntime<TContext, TResult, TRoute>
  ): RouteExecutor<TContext, TResult>
}

const buildResponders = <
  TResponses extends readonly ResponseDefinition<
    string,
    z.ZodTypeAny | undefined
  >[]
>(
  responses: TResponses
): ResponseHelpers<TResponses> => {
  const entries = responses.map(definition => {
    const helper: ResponseHelper<typeof definition> = ((payload?: unknown) => {
      const base: Record<string, unknown> = {
        kind: definition.kind,
        message: definition.message,
      }

      if (definition.dataSchema) {
        const parsed = definition.dataSchema.parse(payload)
        base.data = parsed
      } else {
        base.data = null
      }

      return {
        status: definition.status,
        body: definition.schema.parse(base),
        definition,
      }
    }) as ResponseHelper<typeof definition>

    return [definition.kind, helper] as const
  })

  return Object.fromEntries(entries) as ResponseHelpers<TResponses>
}

export const declareRouter = <
  TContext,
  TResult,
  TRoute extends RouteDefinition<HttpMethod, SchemaLike | undefined, any>
>(
  definition: TRoute,
  handler: RouteHandler<TContext, TRoute>
): DeclaredRoute<TContext, TResult, TRoute> => {
  const responders = buildResponders(definition.responses)

  const createHandler =
    (
      runtime: RouteRuntime<TContext, TResult, TRoute>
    ): RouteExecutor<TContext, TResult> =>
    async context => {
      const executionContext: RouteHandlerContext<TContext> = { context }

      if (definition.authRequired) {
        // FIXME(es3n1n): should we validate it before somehow to avoid overhead
        if (!runtime.ensureAuth) {
          throw new Error(
            `Auth guard missing for route ${definition.method} ${definition.path}`
          )
        }

        executionContext.auth = await runtime.ensureAuth(context)
      }

      const hasBody = definition.body !== undefined

      let parsedBody: RouteBody<typeof definition>

      if (hasBody) {
        // FIXME(es3n1n): should we validate it before somehow to avoid overhead
        if (!runtime.readBody) {
          throw new Error(
            `Route ${definition.method} ${definition.path} expects a body but runtime.readBody is not provided.`
          )
        }

        let rawBody: unknown

        try {
          rawBody = await runtime.readBody(context)
        } catch (error) {
          if (runtime.handleMalformedBody) {
            return await runtime.handleMalformedBody(context, error)
          }

          throw error
        }

        const schema = schemaFrom(definition.body as SchemaLike)
        const result = schema.safeParse(rawBody)
        if (!result.success) {
          if (runtime.handleValidationError) {
            return await runtime.handleValidationError(context, result.error)
          }

          throw result.error
        }

        parsedBody = result.data as RouteBody<typeof definition>
      } else {
        parsedBody = undefined as RouteBody<typeof definition>
      }

      const routeResult = await handler(
        responders,
        parsedBody,
        executionContext
      )
      return await runtime.send(context, routeResult)
    }

  return {
    definition,
    handler,
    createHandler,
  }
}

export type DeclaredRouteExecutor<
  TDeclaredRoute extends DeclaredRoute<any, any, AnyRouteDefinition>
> = ReturnType<TDeclaredRoute['createHandler']>
