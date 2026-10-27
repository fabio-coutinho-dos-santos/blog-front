// Server-side only: ENVIRONMENT has no NEXT_PUBLIC_ prefix, so the browser never sees it.
// "production" makes the public site read-only (no admin shortcuts in the menu or lists).
// NODE_ENV is not used on purpose: `next build` / `next start` always set it to
// "production", even when running locally.
export function isProductionEnvironment(environment = process.env.ENVIRONMENT): boolean {
  return environment?.trim().toLowerCase() === 'production'
}
