All evidence gathered. Here is the findings report.

---

## Audit: @tanstack/svelte-query v6 usage (installed: svelte-query 6.1.0 + query-core 5.90.20)

### Findings

- **[ANTI-PATTERN (latent BUG)]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/routes/+layout.ts:11` — `createQueryClient()` is called inside the root `load`, so any load re-run (`invalidateAll()`, a future `depends()` invalidation) constructs a brand-new QueryClient and re-fetches config + user into it, while every mounted query keeps using the _first_ client forever.
  - evidence: `apps/web-new/node_modules/@tanstack/svelte-query/dist/QueryClientProvider.svelte` — `setQueryClientContext(client)` runs exactly once at component init and `onMount(() => client.mount())` mounts only the initial client; Svelte context is not reactive to a changed `client` prop. The TanStack SvelteKit SSR docs (docs/framework/svelte/ssr.md, fetched via context7) put client creation in `+layout.ts` solely so each _server request_ gets its own client — with `ssr = false` that rationale is moot, and the copy-from-`apps/web` (identical file) inherits the same flaw. Result on `invalidateAll()`: two wasted API calls into an orphaned client, and `data.clientConfig` diverging from the cache the app actually reads.
  - fix (paste-ready, module scope is safe because the module only ever evaluates in the browser under `ssr = false`; with `staleTime: Infinity` a re-run then resolves from cache with zero network):

    ```ts
    const queryClient = createQueryClient()

    export const load: LayoutLoad = async () => {
      const clientConfig = await queryClient.fetchQuery(
        clientConfigQueryOptions
      )
      await queryClient.prefetchQuery(userSelfQueryOptions)

      return { queryClient, clientConfig }
    }
    ```

- **[SIMPLIFICATION]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/query/core.ts:28` — `enabled: browser` in `defaultOptions.queries` is dead weight in an `ssr = false` SPA.
  - evidence: ssr.md documents this exact snippet as "disable queries on the server, preventing execution after HTML is sent" — but with `export const ssr = false` (+layout.ts:6) neither `load` nor components ever execute server-side, so `browser` is always `true` here. Additionally `enabled` never gates imperative fetches anyway: `query-core` source `node_modules/.bun/@tanstack+query-core@5.90.20/node_modules/@tanstack/query-core/src/queryClient.ts` `fetchQuery()` builds and fetches with no `enabled` check.
  - fix: delete `enabled: browser,` and the `import { browser } from '$app/environment'` line from core.ts.

- **[SIMPLIFICATION]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/query/config.ts:17` — `staleTime: Infinity` without `gcTime: Infinity` means the "never refetch" client config is garbage-collected 5 minutes after the last observer unsubscribes; a later `useClientConfig()` mount then goes through a full pending state and network refetch, contradicting the intent.
  - evidence: `query-core/src/removable.ts:27` — default gcTime is `isServer ? Infinity : 5 * 60 * 1000`; the layout's `fetchQuery` creates a cache entry with zero observers, so its GC timer starts immediately.
  - fix:
    ```ts
    staleTime: Infinity,
    gcTime: Infinity,
    ```

- **[SIMPLIFICATION]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/query/core.ts:41-48` — `createApiMutation` has zero callers in web-new; the actual mutation path is `useApiForm`, which does **not** interact with svelte-query at all (it calls `apiRequest` directly — no cache writes, no invalidation). Two parallel mutation abstractions with one unused is dead code per the project's "no speculative features / replace, don't deprecate" rules.
  - evidence: `rg 'createApiMutation'` across `apps/web-new/src` — only the definition. `use-api-form.svelte.ts` imports nothing from `@tanstack/svelte-query`. Consequence for later phases: form successes (login, team rename, solve) will not invalidate `userSelf`/`challenges` caches; the 30 s `refetchInterval` on `userSelf` (user.ts:19) papers over it with up-to-30 s staleness. Decide now: either delete `createApiMutation`, or route `useApiForm.submit` through it / accept a `queryClient` + invalidation in `onSuccess`.
  - fix (minimal): delete the export; add explicit `useQueryClient().invalidateQueries(...)` calls in form `onSuccess` handlers when those pages land.

- **[STYLE]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/query/core.ts:31` — `error?.name === 'ApiError'` uses a dead optional chain and a stringly-typed check when the class is in scope four lines up (and `ApiError.isNotStarted` already uses `instanceof`).
  - evidence: `query-core/src/retryer.ts:36-39` — `ShouldRetryFunction<TError> = (failureCount: number, error: TError) => boolean`; `error` is the thrown `Error`, never nullish.
  - fix:
    ```ts
    retry: (failureCount, error) =>
      error instanceof ApiError ? false : failureCount < 3,
    ```

### Confirmed correct per current docs/installed types

- **`createQuery(() => options)` thunk form** — correct and required in v6: `dist/createQuery.d.ts` takes `Accessor<...Options>` (`Accessor<T> = () => T`, `dist/types.d.ts:3`); migration guide (docs/framework/svelte/migrate-from-v5-to-v6.md) mandates the thunk. Returning a module-constant `queryOptions` object from the thunk is fine — these options have no reactive inputs.
- **`queryOptions` helper** — exported by v6 (`dist/index.d.ts:7`) and used correctly for `DataTag` key typing shared between `fetchQuery` in load and `createQuery` in hooks.
- **`createMutation(() => ({ mutationFn }))`** in `createApiMutation` — matches the v6 signature (`dist/createMutation.svelte.d.ts`: `Accessor<CreateMutationOptions>`); it correctly resolves the client from context at component init, so the wrapper is sound _if kept_.
- **QueryClient via load data + `<QueryClientProvider client={data.queryClient}>` + `fetchQuery`/`prefetchQuery` in load** — this is the documented SvelteKit integration verbatim (ssr.md via context7); passing through load data rather than manual `setContext` is the documented pattern. `prefetchQuery` swallowing errors (`.then(noop).catch(noop)`, queryClient.ts:380) makes the un-guarded userSelf prefetch safe.
- **retry function signature** — `(failureCount, error)` matches `ShouldRetryFunction`. Note the default-level retry also applies to the layout's `fetchQuery` (it only defaults `retry: false` when undefined — queryClient.ts:358-360), so a hard-down API delays first paint by ~7 s of backoff; acceptable, but know it's there.
- **`staleTime: 5min` + `refetchInterval: 30s`** on userSelf — coherent: interval ticks call `#executeFetch()` unconditionally (queryObserver.ts:400-405, staleTime not consulted), staleTime only gates remount refetches. Identical to `apps/web/src/lib/query/user.ts`, so intent is preserved.

### VERDICT

The v6 API surface is used correctly — thunk-form `createQuery`/`createMutation`, `queryOptions` typing, and the provider-via-load wiring all match the installed 6.1.0 types and current TanStack Svelte docs; this was not written from v5 memory. The weaknesses are all _SPA-fit_ issues from transplanting the docs' SSR recipe (and the old app's layout verbatim) into an `ssr = false` app. Highest-leverage changes: (1) hoist the QueryClient to module scope in `+layout.ts` so load re-runs can never orphan the cache, (2) drop `enabled: browser` and add `gcTime: Infinity` to the client-config query — three lines that make the caching story actually match its intent, (3) decide the single mutation path now (`useApiForm` + explicit invalidation, or `createApiMutation`) before Phase 1 builds forms on a layer that never talks to the cache.
