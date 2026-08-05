import { NextResponse } from "next/server";
import { mockRailsAllowed } from "@/lib/security-flags";

/**
 * Gate for zero-LLM proof endpoints (OAuth probe + scripted tool execute).
 *
 * Allowed when:
 * - Header `x-miai-proof` matches `PROOF_HARNESS_SECRET`, or
 * - Staging mock rails are dual-acked (demo workspace proofs without a secret).
 */
export function assertProofHarness(req: Request): NextResponse | null {
  const secret = (process.env.PROOF_HARNESS_SECRET || "").trim();
  const provided = (req.headers.get("x-miai-proof") || "").trim();
  if (secret && provided && provided === secret) {
    return null;
  }
  if (mockRailsAllowed()) {
    return null;
  }
  return NextResponse.json(
    {
      error: "proof_harness_forbidden",
      hint: "Set PROOF_HARNESS_SECRET and send x-miai-proof, or enable mock-rails dual-ack on staging.",
    },
    { status: 403 },
  );
}
