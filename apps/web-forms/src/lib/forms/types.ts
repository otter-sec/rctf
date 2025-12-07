export type Validator<T> = (value: T) => string | null

export type FieldValidators<T extends Record<string, unknown>> = {
  [K in keyof T]?: Validator<T[K]>
}

export type FormErrors<T extends Record<string, unknown>> = {
  [K in keyof T]?: string | null
}

export type FormTouched<T extends Record<string, unknown>> = {
  [K in keyof T]?: boolean
}
