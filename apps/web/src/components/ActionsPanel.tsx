"use client";

import { useEffect, useMemo, useState } from "react";

interface Connector {
  id: string;
  name: string;
  phase: number;
  description: string;
  recommended?: boolean;
  auth?: string;
}

interface OauthStatus {
  id: string;
  name: string;
  configured: boolean;
  connected: boolean;
  requiresShop?: boolean;
  requiresSubdomain?: boolean;
  missingEnv: string[];
  clientIdEnv?: string;
  clientSecretEnv?: string;
}

export function ActionsPanel({
  agentId,
  connectors,
  connected,
  onConnected,
}: {
  agentId: string;
  connectors: Connector[];
  connected: string[];
  onConnected: (ids: string[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<OauthStatus[]>([]);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [mcpToken, setMcpToken] = useState("");
  const [shop, setShop] = useState("");
  const [zendeskSub, setZendeskSub] = useState("");
  const [emailProvider, setEmailProvider] = useState<"google" | "microsoft">("google");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [slackChannels, setSlackChannels] = useState<
    Array<{ id: string; name: string; is_private: boolean; is_member: boolean }>
  >([]);
  const [slackChannel, setSlackChannel] = useState("");
  const [slackSavedChannel, setSlackSavedChannel] = useState<string | null>(null);
  const [slackNeedsInvite, setSlackNeedsInvite] = useState(false);

  const byId = useMemo(() => new Map(status.map((s) => [s.id, s])), [status]);
  const slackConnected = Boolean(byId.get("slack")?.connected) || connected.includes("slack");
  const missingCount = status.filter((s) => !s.configured).length;

  async function loadSlackChannels() {
    const res = await fetch("/api/slack/channels");
    if (!res.ok) return;
    const data = await res.json();
    setSlackChannels(data.channels ?? []);
    setSlackSavedChannel(data.current ?? null);
    if (data.current) setSlackChannel(data.current);
    else if (data.channels?.length) setSlackChannel(data.channels[0].id);
  }

  useEffect(() => {
    if (!slackConnected) return;
    void loadSlackChannels();
  }, [slackConnected]);

  async function saveSlackChannel() {
    if (!slackChannel) return;
    setBusy("slack-channel");
    setError(null);
    try {
      const res = await fetch("/api/slack/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: slackChannel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the channel");
        return;
      }
      setSlackSavedChannel(data.channel);
      setSlackNeedsInvite(Boolean(data.needs_invite));
    } finally {
      setBusy(null);
    }
  }

  async function refreshStatus() {
    const res = await fetch("/api/oauth/status");
    const data = await res.json();
    setStatus(data.oauth ?? []);
    if (typeof data.callbackUrl === "string") setCallbackUrl(data.callbackUrl);
    if (Array.isArray(data.connected)) onConnected(data.connected);
    const slackOn =
      Array.isArray(data.connected) && data.connected.includes("slack")
        ? true
        : (data.oauth ?? []).some((o: OauthStatus) => o.id === "slack" && o.connected);
    if (slackOn) void loadSlackChannels();
  }

  useEffect(() => {
    void refreshStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "error") {
      setError(params.get("message") ?? "OAuth failed");
    } else if (params.get("oauth") && params.get("oauth") !== "error") {
      void refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function startOAuth(connectorId: string) {
    const oauth = byId.get(connectorId);
    if (oauth && !oauth.configured) {
      setError(
        `${oauth.name} needs Railway / .env credentials: ${(oauth.missingEnv ?? []).join(", ")}. Register redirect URI ${callbackUrl || "/api/oauth/callback"} in the provider console.`,
      );
      return;
    }

    setBusy(connectorId);
    setError(null);
    try {
      const qs = new URLSearchParams({
        agentId,
        format: "json",
        returnTo: `/agents/${agentId}?tab=actions`,
      });
      if (connectorId === "shopify") {
        if (!shop.trim()) {
          setError("Enter your Shopify store domain first (e.g. my-store.myshopify.com)");
          return;
        }
        qs.set("shop", shop.trim());
      }
      if (connectorId === "zendesk") {
        if (!zendeskSub.trim()) {
          setError("Enter your Zendesk subdomain first");
          return;
        }
        qs.set("subdomain", zendeskSub.trim());
      }
      if (connectorId === "email") qs.set("emailProvider", emailProvider);

      const res = await fetch(`/api/oauth/${connectorId}/start?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error +
            (data.missingEnv?.length
              ? ` — set ${data.missingEnv.join(", ")} on Railway or in apps/web/.env.local`
              : ""),
        );
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(connectorId: string) {
    setBusy(connectorId);
    try {
      await fetch(`/api/oauth/${connectorId}/disconnect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (connectorId === "slack") {
        setSlackChannels([]);
        setSlackChannel("");
        setSlackSavedChannel(null);
        setSlackNeedsInvite(false);
      }
      await refreshStatus();
    } finally {
      setBusy(null);
    }
  }

  async function saveCredentials(connectorId: string, config: Record<string, string>) {
    setBusy(connectorId);
    setError(null);
    try {
      const res = await fetch("/api/connectors/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, connectorId, config }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save credentials");
        return;
      }
      if (data.rental) onConnected(data.rental.connectedConnectors);
      await refreshStatus();
    } finally {
      setBusy(null);
    }
  }

  const phase1 = connectors.filter((c) => c.phase === 1);
  const phase2 = connectors.filter((c) => c.phase === 2);

  function row(c: Connector) {
    const oauth = byId.get(c.id);
    const isOauth = Boolean(oauth) || c.auth === "oauth";
    const on = connected.includes(c.id) || Boolean(oauth?.connected);
    const configured = oauth ? oauth.configured : true;

    return (
      <div
        key={c.id}
        className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.name}</span>
              {c.recommended && <span className="chip chip-live">Recommended</span>}
              {on && <span className="chip chip-live">Connected</span>}
              {isOauth && configured && !on && <span className="chip chip-live">Ready</span>}
              {isOauth && !configured && <span className="chip">Env missing</span>}
              {isOauth && <span className="chip">OAuth</span>}
            </div>
            <p className="text-xs text-[var(--muted)]">{c.description}</p>
            {isOauth && !configured && oauth?.missingEnv?.length ? (
              <p className="mt-1 font-mono text-[11px] text-[var(--warn)]">
                Set {oauth.missingEnv.join(" + ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isOauth ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  disabled={busy === c.id || !configured}
                  title={
                    !configured
                      ? `Configure ${(oauth?.missingEnv ?? []).join(", ")} first`
                      : undefined
                  }
                  onClick={() => startOAuth(c.id)}
                >
                  {!configured ? "Add credentials first" : on ? "Reconnect" : "Connect with OAuth"}
                </button>
                {on && (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={busy === c.id}
                    onClick={() => disconnect(c.id)}
                  >
                    Disconnect
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {c.id === "shopify" && (
          <input
            className="input text-xs"
            placeholder="my-store.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
          />
        )}
        {c.id === "zendesk" && (
          <input
            className="input text-xs"
            placeholder="your-subdomain"
            value={zendeskSub}
            onChange={(e) => setZendeskSub(e.target.value)}
          />
        )}
        {c.id === "slack" && on && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input text-xs"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
              >
                {slackChannels.length === 0 && <option value="">Loading channels…</option>}
                {slackChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.is_private ? "private · " : "#"}
                    {ch.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary text-xs"
                disabled={busy === "slack-channel" || !slackChannel}
                onClick={() => void saveSlackChannel()}
              >
                {slackSavedChannel === slackChannel ? "Saved" : "Set handoff channel"}
              </button>
            </div>
            {slackSavedChannel && (
              <p className="text-xs text-[var(--muted)]">
                Handoffs go to{" "}
                <code>
                  {slackChannels.find((ch) => ch.id === slackSavedChannel)?.name ??
                    slackSavedChannel}
                </code>
                {slackNeedsInvite && (
                  <>
                    {" "}
                    — private channel: run <code>/invite @YourBot</code> in Slack once.
                  </>
                )}
              </p>
            )}
          </div>
        )}
        {c.id === "email" && (
          <div className="flex gap-2">
            {(["google", "microsoft"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${emailProvider === p ? "chip-live" : ""}`}
                onClick={() => setEmailProvider(p)}
              >
                {p === "google" ? "Gmail" : "Microsoft 365"}
              </button>
            ))}
          </div>
        )}

        {c.id === "webhook" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input text-xs"
              placeholder="https://hooks.example.com/miai"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <input
              className="input text-xs"
              placeholder="shared secret"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs sm:col-span-2"
              disabled={busy === "webhook"}
              onClick={() =>
                saveCredentials("webhook", {
                  url: webhookUrl,
                  secret: webhookSecret || "miai",
                })
              }
            >
              Save webhook
            </button>
          </div>
        )}

        {c.id === "mcp" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input text-xs"
              placeholder="https://mcp.example.com"
              value={mcpEndpoint}
              onChange={(e) => setMcpEndpoint(e.target.value)}
            />
            <input
              className="input text-xs"
              placeholder="bearer token"
              value={mcpToken}
              onChange={(e) => setMcpToken(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs sm:col-span-2"
              disabled={busy === "mcp"}
              onClick={() =>
                saveCredentials("mcp", { endpoint: mcpEndpoint, token: mcpToken })
              }
            >
              Save MCP
            </button>
          </div>
        )}

        {c.id === "whatsapp" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input text-xs"
              placeholder="Cloud API permanent token"
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
            />
            <input
              className="input text-xs"
              placeholder="Phone number ID"
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs sm:col-span-2"
              disabled={busy === "whatsapp"}
              onClick={() =>
                saveCredentials("whatsapp", {
                  api_key: whatsappToken,
                  phone_number_id: whatsappPhoneId,
                })
              }
            >
              Save WhatsApp credentials
            </button>
          </div>
        )}

        {c.id === "stripe" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input text-xs"
              placeholder="sk_live_… or sk_test_…"
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy === "stripe"}
              onClick={() => saveCredentials("stripe", { api_key: stripeKey })}
            >
              Save Stripe
            </button>
          </div>
        )}

        {c.id === "woocommerce" && (
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="input text-xs sm:col-span-3"
              placeholder="https://shop.example.com"
              value={wooUrl}
              onChange={(e) => setWooUrl(e.target.value)}
            />
            <input
              className="input text-xs"
              placeholder="Consumer key"
              value={wooKey}
              onChange={(e) => setWooKey(e.target.value)}
            />
            <input
              className="input text-xs"
              placeholder="Consumer secret"
              value={wooSecret}
              onChange={(e) => setWooSecret(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy === "woocommerce"}
              onClick={() =>
                saveCredentials("woocommerce", {
                  store_url: wooUrl,
                  consumer_key: wooKey,
                  consumer_secret: wooSecret,
                })
              }
            >
              Save Woo
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      <div className="panel p-4">
        <h2 className="text-sm font-semibold">Connector Hub — Phase 1</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          OAuth connectors open the provider consent screen. Tokens are sealed server-side and never
          sent to the model. Use <strong className="text-[var(--text)]">live</strong> chat after
          Connect. For Slack, pick a handoff channel after connecting.
        </p>
        {callbackUrl ? (
          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2 text-xs">
            <p className="font-medium text-[var(--text)]">Shared redirect URI (all providers)</p>
            <code className="mt-1 block break-all text-[var(--accent-bright)]">{callbackUrl}</code>
            {missingCount > 0 ? (
              <p className="mt-2 text-[var(--muted)]">
                {missingCount} connector{missingCount === 1 ? "" : "s"} still need client id/secret
                on Railway (same pattern as Slack). See{" "}
                <code>docs/CONNECTOR_OAUTH.md</code>.
              </p>
            ) : (
              <p className="mt-2 text-[var(--accent)]">All OAuth apps have credentials configured.</p>
            )}
          </div>
        ) : null}
        <div className="mt-4 grid gap-2">{phase1.map(row)}</div>
      </div>

      <div className="panel p-4">
        <h2 className="text-sm font-semibold">Phase 2 connectors</h2>
        <div className="mt-3 grid gap-2">{phase2.map(row)}</div>
      </div>
    </div>
  );
}
