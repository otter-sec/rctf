import { z } from 'zod'
import type { StatusCode } from './utils'

export interface ResponseDefinition<
  TKind extends string,
  TDataSchema extends z.ZodTypeAny | undefined = undefined,
> {
  readonly kind: TKind
  readonly status: StatusCode
  readonly message: string
  readonly dataSchema: TDataSchema
  readonly schema: z.ZodTypeAny
}

type ResponseOptions<TDataSchema extends z.ZodTypeAny | undefined = undefined> =
  {
    status: StatusCode
    message: string
    data?: TDataSchema
  }

export function response<
  TKind extends string,
  TDataSchema extends z.ZodTypeAny | undefined = undefined,
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

export type ResponseResult<
  TDefinition extends ResponseDefinition<string, z.ZodTypeAny | undefined>,
> = {
  status: TDefinition['status']
  body: ResponseBody<TDefinition>
  definition: TDefinition
}

export type ResponseHelper<
  TDefinition extends ResponseDefinition<string, z.ZodTypeAny | undefined>,
> = TDefinition['dataSchema'] extends z.ZodTypeAny
  ? (
      payload: z.input<NonNullable<TDefinition['dataSchema']>>
    ) => ResponseResult<TDefinition>
  : () => ResponseResult<TDefinition>

export type ResponseHelpers<
  TResponses extends readonly ResponseDefinition<
    string,
    z.ZodTypeAny | undefined
  >[],
> = {
  [R in TResponses[number] as R['kind']]: ResponseHelper<R>
}

type ResponseDataShape<
  TDefinition extends ResponseDefinition<string, z.ZodTypeAny | undefined>,
> = TDefinition['dataSchema'] extends z.ZodTypeAny
  ? z.output<NonNullable<TDefinition['dataSchema']>>
  : never

export type ResponseBody<
  TDefinition extends ResponseDefinition<string, z.ZodTypeAny | undefined>,
> =
  TDefinition extends ResponseDefinition<string, infer TData>
    ? TData extends z.ZodTypeAny
      ? {
          kind: TDefinition['kind']
          message: TDefinition['message']
          data: z.output<TData>
        }
      : {
          kind: TDefinition['kind']
          message: TDefinition['message']
        }
    : never

export type ResponseData<T extends ResponseDefinition<string, z.ZodTypeAny>> =
  z.output<T['dataSchema']>
