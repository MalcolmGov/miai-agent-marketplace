export async function slackHandoff(
  token: string,
  args: Record<string, unknown>,
  meta: Record<string, string>,
): Promise<Record<string, unknown>> {
  const channel =
    String(args.channel ?? meta.default_channel ?? process.env.SLACK_DEFAULT_CHANNEL ?? "").trim();
  if (!channel) {
    throw new Error(
      "Slack connected but no handoff channel set — pick one in Actions after connecting",
    );
  }
  const customer = (args.customer ?? {}) as Record<string, unknown>;
  const custName = customer.name ?? args.name;
  const custPhone = customer.phone ?? args.phone ?? args.contact;
  const custEmail = customer.email ?? args.email;
  const text = [
    `*Agent handoff*`,
    args.reason ? `Reason: ${args.reason}` : null,
    args.summary ? `Summary: ${args.summary}` : null,
    custName || custPhone || custEmail ? `*Contact for follow-up:*` : null,
    custName ? `• Name: ${custName}` : null,
    custPhone ? `• Phone: ${custPhone}` : null,
    custEmail ? `• Email: ${custEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text }),
  });
  const json = (await res.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };
  if (!json.ok) throw new Error(`Slack: ${json.error ?? "post_failed"}`);
  return { routed: true, provider: "slack", channel: json.channel, ts: json.ts };
}
