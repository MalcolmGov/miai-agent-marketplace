export const dynamic = "force-dynamic";

/**
 * Public build/version probe. Server-side changes (e.g. connector logic) don't alter the client
 * bundle, so there's otherwise no way to confirm which commit is actually running. Railway injects
 * the git metadata into the runtime env; this surfaces it. No auth (see public-paths.ts).
 */
export function GET() {
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.SOURCE_COMMIT ||
    "unknown";
  return Response.json({
    commit,
    shortCommit: commit === "unknown" ? "unknown" : commit.slice(0, 7),
    branch: process.env.RAILWAY_GIT_BRANCH || null,
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || null,
    node: process.version,
  });
}
