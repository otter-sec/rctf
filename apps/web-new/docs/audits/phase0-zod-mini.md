All evidence is gathered. Here is the findings report.

# zod v4 / zod-mini audit — apps/web-new

Installed ground truth: single `zod@4.3.6` (`/Users/enscribe/Repositories/jktrn/rctf-new/node_modules/.bun/zod@4.3.6/node_modules/zod`, hereafter `$Z`). All `@rctf/types` schemas are `zod/mini` (`packages/types/src/**` imports `from 'zod/mini'` exclusively; web-new/package.json pins `zod: 4.3.6`).

## Findings

- **[BUG (latent)] /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/api/index.ts:202** — `finalBody = { ...finalBody, captchaCode }` appends the key `captchaCode` for every route with `captchaAction`, but v1 captcha routes (`RegisterRoute`, `RecoverRoute` in `packages/types/src/routes/v1/auth.ts`) declare `recaptchaCode` in their body schema; the API server validates the body against that schema before reading captcha, and v4 `z.object` strips unrecognized keys, so `captchaCode` is silently dropped and `apps/api/src/lib/router.ts:372-374` reads `bodyWithCaptcha?.recaptchaCode` → `undefined` → captcha always fails on v1 register/recover when captcha is enabled.
  - evidence: https://zod.dev/api (Objects): "By default, unrecognized keys are _stripped_ from the parsed result." Server reads parsed body: `/Users/enscribe/Repositories/jktrn/rctf-new/apps/api/src/lib/router.ts:368-374`. No web-new caller hits a v1 captcha route yet (rg found none), and `apps/web/src/lib/api/index.ts:203` has the identical latent code — flagging because `apiRequest` is generic over all routes.
  - fix: key the field on route version, mirroring the server:
    ```ts
    if (captchaCode) {
      const captchaField = route.path.startsWith('/v1/')
        ? 'recaptchaCode'
        : 'captchaCode'
      finalBody = { ...finalBody, [captchaField]: captchaCode }
    }
    ```

- **[ANTI-PATTERN] /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/api/index.ts:152-154** — `pickArgs` uses throwing `.parse()` on all three section schemas; a validation failure throws `$ZodRealError` whose `.message` is `JSON.stringify(issues, jsonStringifyReplacer, 2)`, which then surfaces verbatim to users (`use-api-form.svelte.ts:126` puts `err.message` into the `_form` error since `$ZodRealError` extends `Error`) and gets retried 3× by tanstack-query (`query/core.ts:31` only short-circuits `name === 'ApiError'`; the zod error's `name` is `'$ZodError'`, `$Z/v4/core/errors.js:4`).
  - evidence: `$Z/v4/core/errors.js:13` (`inst.message = JSON.stringify(def, util.jsonStringifyReplacer, 2)`), `:20` (`$ZodRealError … { Parent: Error }`), `$Z/v4/core/parse.js:17` (schema `.parse` throws `$ZodRealError`). https://zod.dev/error-formatting documents `z.prettifyError()` as the human-readable formatter.
  - fix:

    ```ts
    import { prettifyError } from 'zod/mini'

    const parseSection = (
      route: AnyRouteDefinition,
      label: 'params' | 'query' | 'body',
      source: Record<string, unknown>
    ) => {
      const schema = route[label]
      if (!schema) return undefined
      const result = schema.safeParse(source)
      if (!result.success) {
        throw new Error(
          `Invalid ${label} for ${route.method} ${route.path}:\n${prettifyError(result.error)}`
        )
      }
      return result.data
    }

    const pickArgs = <TRoute extends AnyRouteDefinition>(
      route: TRoute,
      args: InlineArgs<TRoute> | undefined
    ) => {
      const inlineSource = (args ?? {}) as Record<string, unknown>
      return {
        params: parseSection(route, 'params', inlineSource),
        query: parseSection(route, 'query', inlineSource),
        body: parseSection(route, 'body', inlineSource),
      }
    }
    ```

  - note: the triple-parse of one merged flat object is itself sane per docs — each `z.object` strips the other sections' keys (https://zod.dev/api, Objects) and no `strictObject`/`looseObject`/`catchall` exists anywhere in `packages/types/src` (rg-verified). Caveat for the future: a `z.strictObject` params/query schema would reject the merged object with `unrecognized_keys`.

- **[SIMPLIFICATION] /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/forms/use-api-form.svelte.ts:82-95** — `validateAll` hand-rolls exactly what `z.flattenError()` does (bucket issues by `path[0]` into fieldErrors, path-less issues into formErrors).
  - evidence: https://zod.dev/error-formatting: "The majority of schemas are _flat_—just one level deep … use `z.flattenError()` to retrieve a clean, shallow error object" returning `{ formErrors: string[], fieldErrors: { [key]: string[] } }`; exported from `zod/mini` (`$Z/v4/mini/external.d.ts:6`); implementation is semantically identical to the hand-rolled loop (`$Z/v4/core/errors.js:21-34`).
  - fix:

    ```ts
    import { flattenError, type core } from 'zod/mini'

    // in validateAll, replacing lines 82-95:
    const { formErrors, fieldErrors } = flattenError(
      result.error as core.$ZodError<Data>
    )
    const nextErrors: FormErrors<Data> = {}
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const first = (messages as string[] | undefined)?.[0]
      if (first) nextErrors[field as keyof Data] = first
    }
    if (formErrors.length > 0) nextErrors._form = formErrors.join('\n')
    errors = nextErrors
    return false
    ```

    (Only behavioral delta: issues whose `path[0]` is a number/symbol move from `_form` into a field bucket — irrelevant for these flat form schemas.)

- **[STYLE] /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/api/index.ts:139** — `${parsed.error}` interpolates the error's custom `toString` (the 2-space-indented JSON issue dump) into the thrown message instead of the documented pretty formatter.
  - evidence: `$Z/v4/core/errors.js:13-18` (toString → JSON message); https://zod.dev/error-formatting: `z.prettifyError()` "returns a human-readable string representation"; signature `prettifyError(error): string` at `$Z/v4/core/errors.d.ts:219`, exported from `zod/mini` (`$Z/v4/mini/external.d.ts:6`).
  - fix: `` `Failed to validate API response for ${route.method} ${route.path}:\n${prettifyError(parsed.error)}` ``

- **[STYLE] /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/forms/use-api-form.svelte.ts:62 and :85** — `issue.path?.[0]` uses dead optional chaining; on `$ZodIssue`, `path` is a required property.
  - evidence: `$Z/v4/core/errors.d.ts:9`: `readonly path: PropertyKey[];` (non-optional); https://zod.dev/v4/changelog: issues "still conform to the same base interface" with `readonly path: PropertyKey[]`. (Only _raw_ internal issues have optional path — not what `.issues` exposes.)
  - fix: `issue.path[0] === field` (line 62) and `const field = issue.path[0]` (line 85). Moot for line 85 if the flattenError simplification lands.

## Explicitly CORRECT per current docs (no action)

- **Method-form `.parse`/`.safeParse` on zod/mini schemas** (api/index.ts:136,152-154; use-api-form.svelte.ts:55,76) is valid — https://zod.dev/packages/mini: "All Zod Mini schemas implement the same parsing methods as `zod`"; confirmed on installed types at `$Z/v4/mini/schemas.d.ts:14-15`. The functional `z.parse(schema, data)` also exists but is not required.
- **`import type { core } from 'zod/mini'`** (use-api-form.svelte.ts:8) is valid — `$Z/v4/mini/external.d.ts:1`: `export * as core from "../core/index.js"`. The `as core.$ZodError` casts are load-bearing, not redundant: `AnyRouteDefinition = RouteDefinition<any>` makes `route.body` type `any`, so `safeParse` returns `any`.
- **No deprecated error APIs**: no `.format()`, `.flatten()`, `.formErrors`, or `z.formatError` anywhere in web-new (rg-verified) — all deprecated/dropped per https://zod.dev/v4/changelog and https://zod.dev/error-formatting.
- **@rctf/types route schemas** (context read: `packages/types/src/routes/v1/auth.ts`, `v2/auth.ts`, `internal/responses.ts`): pure zod/mini idiom — wrapper functions (`z.optional(...)`), checks via `.check(...)`, `z.superRefine` and `z.describe` both exported un-deprecated from the installed `zod/mini` (`$Z/v4/mini/schemas.d.ts:373-374`), `ctx.addIssue({ code: 'custom', … })` matches the v4 `$RefinementCtx` API (`$Z/v4/core/api.d.ts:283-285`).
- **Performance**: every schema is a module-level constant in `@rctf/types`; web-new constructs zero schemas per call — consistent with v4 guidance to do schema work once at top level (https://zod.dev/packages/mini notes parsing, not construction, as the hot path).

VERDICT: zod usage in web-new is fundamentally sound — the mini variant is used correctly (method-form parsing is legitimate on mini schemas, `core` namespace import is real, no deprecated v3-era error APIs), and schema work is all top-level. The gap is entirely in error _presentation_ and one latent contract mismatch. Highest-leverage changes: (1) switch `pickArgs` to `safeParse` + `prettifyError` so client-side validation failures stop leaking JSON.stringify'd issue dumps into form errors and stop being pointlessly retried by tanstack-query; (2) fix the `captchaCode` vs `recaptchaCode` field for v1 captcha routes before any auth page ships; (3) replace the hand-rolled issue bucketing in `validateAll` with the documented `flattenError`. Files: /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/api/index.ts, /Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/forms/use-api-form.svelte.ts.
