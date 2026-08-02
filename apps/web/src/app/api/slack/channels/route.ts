import { NextResponse } from "next/server";
import { getToken, getValidAccessToken, updateTokenFields } from "@miai/connectors";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { parseJsonBody, slackChannelsBodySchema } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  is_archived: boolean;
}

/** GET → list channels the connected Slack workspace exposes, plus the saved default. */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : (new URL(req.url).searchParams.get("workspaceId") ?? auth.workspaceId);
  const stored = await getValidAccessToken(workspaceId, "slack");
  if (!stored?.accessToken) {
    return NextResponse.json({ error: "slack_not_connected" }, { status: 404 });
  }

  const channels: SlackChannel[] = [];
  let cursor = "";
  // Slack paginates; two pages of 200 is plenty for a picker.
  for (let page = 0; page < 2; page++) {
    const qs = new URLSearchParams({
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    });
    const res = await fetch(`https://slack.com/api/conversations.list?${qs}`, {
      headers: { authorization: `Bearer ${stored.accessToken}` },
    });
    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      channels?: SlackChannel[];
      response_metadata?: { next_cursor?: string };
    };
    if (!json.ok) {
      return NextResponse.json(
        { error: json.error ?? "slack_list_failed" },
        { status: 502 },
      );
    }
    channels.push(...(json.channels ?? []));
    cursor = json.response_metadata?.next_cursor ?? "";
    if (!cursor) break;
  }

  const token = await getToken(workspaceId, "slack");
  return NextResponse.json({
    current: token?.meta.default_channel ?? null,
    channels: channels
      .filter((c) => !c.is_archived)
      .map((c) => ({
        id: c.id,
        name: c.name,
        is_private: c.is_private,
        is_member: c.is_member,
      })),
  });
}

/** POST {channel, workspaceId?} → save as the workspace's default handoff channel. */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const parsed = await parseJsonBody(req, slackChannelsBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const channel = body.channel.trim();

  const stored = await getValidAccessToken(workspaceId, "slack");
  if (!stored?.accessToken) {
    return NextResponse.json({ error: "slack_not_connected" }, { status: 404 });
  }

  let needsInvite = false;
  const joinRes = await fetch("https://slack.com/api/conversations.join", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stored.accessToken}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel }),
  });
  const join = (await joinRes.json()) as { ok: boolean; error?: string };
  if (!join.ok) {
    // method_not_supported_for_channel_type / missing_scope → private channel: invite needed.
    needsInvite = join.error !== "already_in_channel";
  }

  await updateTokenFields(workspaceId, "slack", {
    meta: { ...(stored.meta ?? {}), default_channel: channel },
  });
  await appendAudit({
    workspaceId,
    type: "connector",
    detail: { connector: "slack", action: "default_channel_set", channel },
  });

  return NextResponse.json({ ok: true, channel, needs_invite: needsInvite });
}
