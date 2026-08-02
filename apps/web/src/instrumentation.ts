/**
 * Next.js server boot hook — fail closed on weak secrets / mock rails in production.
 * Staging demos: set ALLOW_MOCK_RAILS=1.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertBootHardening } = await import("./lib/security");
  assertBootHardening();
}
