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

export interface FormState<T extends Record<string, unknown>> {
  values: T
  errors: FormErrors<T>
  touched: FormTouched<T>
  readonly isDirty: boolean
  readonly isValid: boolean
  readonly isSubmitting: boolean
}

export interface FormActions<T extends Record<string, unknown>> {
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  setError: <K extends keyof T>(field: K, error: string | null) => void
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void
  setServerError: (response: { message: string }) => void
  validate: () => boolean
  reset: () => void
  setSubmitting: (submitting: boolean) => void
}

export type Form<T extends Record<string, unknown>> = FormState<T> &
  FormActions<T>
