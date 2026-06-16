/**
 * Build-time configuration for the API reference generator.
 *
 * `API_BASE_URL` mirrors the `site` origin in `astro.config.ts` and is the base
 * used to render example request URLs. It lives here rather than in `consts.ts`
 * so the directive plugin stays free of app asset imports (the Astro config
 * loader cannot resolve `@/` SVG aliases).
 */
export const API_BASE_URL = "https://rctf.osec.io"
