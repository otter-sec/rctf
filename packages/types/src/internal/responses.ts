import { z } from 'zod/mini'
import type { Infer, Schema, StatusCode } from './utils'

export interface ResponseDefinition<
  TKind extends string = string,
  TDataSchema extends Schema | undefined = Schema | undefined,
> {
  readonly kind: TKind
  readonly status: StatusCode
  readonly message: string
  readonly dataSchema: TDataSchema
  readonly schema: Schema
}

type ResponseOptions<TDataSchema extends Schema | undefined = undefined> = {
  status: StatusCode
  message: string
  data?: TDataSchema
}

export function response<
  TKind extends string,
  TDataSchema extends Schema | undefined = undefined,
>(
  kind: TKind,
  options: ResponseOptions<TDataSchema>
): ResponseDefinition<TKind, TDataSchema> {
  const dataSchema = options.data
  const schema = dataSchema
    ? z.object({
        kind: z.literal(kind),
        message: z.literal(options.message),
        data: dataSchema,
      })
    : z.object({
        kind: z.literal(kind),
        message: z.literal(options.message),
      })

  return {
    kind,
    status: options.status,
    message: options.message,
    dataSchema: (dataSchema ?? undefined) as TDataSchema,
    schema,
  }
}

export type ResponseResult<TDef extends ResponseDefinition> = {
  status: TDef['status']
  body: ResponseBody<TDef>
  definition: TDef
}

export type ResponseHelper<TDef extends ResponseDefinition> =
  TDef['dataSchema'] extends Schema
    ? (
        payload: z.input<NonNullable<TDef['dataSchema']>>
      ) => ResponseResult<TDef>
    : () => ResponseResult<TDef>

export type ResponseHelpers<TResponses extends readonly ResponseDefinition[]> =
  {
    [R in TResponses[number] as R['kind']]: ResponseHelper<R>
  }

export type ResponseBody<TDef extends ResponseDefinition> =
  TDef extends ResponseDefinition
    ? TDef['dataSchema'] extends Schema
      ? {
          kind: TDef['kind']
          message: TDef['message']
          data: Infer<TDef['dataSchema']>
        }
      : { kind: TDef['kind']; message: TDef['message'] }
    : never

export type ResponseData<T extends ResponseDefinition<string, Schema>> = Infer<
  T['dataSchema']
>
