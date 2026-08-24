"use client";

/**
 * Client helper to start a prepaid-token top-up. Shared by the wallet TopUpModal and
 * the setup-flow panel so both behave identically:
 *   1. Ask the server to start a Paystack checkout → redirect the browser there.
 *   2. If payments aren't configured (503), fall back to the mock credit so dev/staging
 *      still works. On live rails that mock call is refused (403) and surfaces as an error.
 */
export type BeginTopUpResult =
  | { kind: "redirect" }
  | { kind: "credited"; tokens: number }
  | { kind: "error"; message: string };

export async function beginTopUp(
  packageId: string,
  scope: "workspace" | "consumer",
): Promise<BeginTopUpResult> {
  try {
    const res = await fetch("/api/payments/paystack/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId, scope }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return { kind: "redirect" };
      }
    }
    if (res.status === 503) {
      const mock = await fetch("/api/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      if (mock.ok) {
        const data = await mock.json();
        return { kind: "credited", tokens: data.tokens };
      }
      const body = await mock.json().catch(() => ({}));
      return { kind: "error", message: body.error ?? "Top-up unavailable." };
    }
    const body = await res.json().catch(() => ({}));
    return { kind: "error", message: body.error ?? "Could not start checkout. Please try again." };
  } catch {
    return { kind: "error", message: "Could not reach the payment service. Please try again." };
  }
}
