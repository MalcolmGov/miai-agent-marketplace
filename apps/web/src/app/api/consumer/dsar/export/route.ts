import { NextResponse } from "next/server";
import { requireConsumer } from "@/lib/consumer-auth";
import { exportConsumerData } from "@/lib/consumer-dsar";

export const dynamic = "force-dynamic";

/**
 * DSAR / data-portability export for the SIGNED-IN person (their own data only).
 * No role check: the caller is the data subject. Never zeroes the wallet.
 */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const payload = await exportConsumerData({
    tenantId: c.auth.workspaceId,
    consumerId: c.consumerId,
  });

  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="miai-consumer-dsar-${Date.now()}.json"`,
      "cache-control": "no-store",
    },
  });
}
