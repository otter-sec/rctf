export class Lazy<T> {
  private cached: T | undefined
  private computed = false

  constructor(private readonly factory: () => T) {}

  get value(): T {
    if (!this.computed) {
      this.cached = this.factory()
      this.computed = true
    }
    return this.cached as T
  }
}

export const defineLazyProperty = <
  TObj extends object,
  TKey extends keyof TObj,
>(
  obj: TObj,
  key: TKey,
  factory: () => TObj[TKey]
): void => {
  const lazy = new Lazy(factory)
  Object.defineProperty(obj, key, {
    get: () => lazy.value,
    configurable: true,
  })
}
