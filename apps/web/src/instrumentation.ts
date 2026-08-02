/**
 * Next.js server boot hook — fail closed on weak secrets / mock rails in production.
 * Staging demos: set ALLOW_MOCK_RAILS=1 and I_UNDERSTAND_MOCK_RAILS_IN_PROD=1.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertBootHardening } = await import("./lib/security");
  assertBootHardening();
  // Migrations run on first Postgres hydrate (store/traceability/etc.) — do not
  // import `pg` from instrumentation; Next webpack-bundles that graph and breaks the build.
}
