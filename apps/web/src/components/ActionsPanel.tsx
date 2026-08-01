"use client";

import { useEffect, useMemo, useState } from "react";
import { isWorkflowFamilyId } from "@/lib/workflows";
import { useT } from "@/lib/locale";

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
  const t = useT();
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const byId = useMemo(() => new Map(status.map((s) => [s.id, s])), [status]);
  const slackConnected = Boolean(byId.get("slack")?.connected) || connected.includes("slack");
  const missingCount = status.filter((s) => !s.configured).length;
  const isWorkflow = isWorkflowFamilyId(agentId);

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
        setError(data.error ?? t("actions.errorSaveChannel"));
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
      setError(params.get("message") ?? t("actions.errorOAuth"));
    } else if (params.get("oauth") && params.get("oauth") !== "error") {
      void refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function startOAuth(connectorId: string) {
    const oauth = byId.get(connectorId);
    if (oauth && !oauth.configured) {
      setError(
        showAdvanced
          ? t("actions.errorNeedsCredentials", {
              name: oauth.name,
              env: (oauth.missingEnv ?? []).join(", "),
              uri: callbackUrl || "/api/oauth/callback",
            })
          : t("actions.errorUnavailableAdvanced", { name: oauth.name }),
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
          setError(t("actions.errorShopifyDomain"));
          return;
        }
        qs.set("shop", shop.trim());
      }
      if (connectorId === "zendesk") {
        if (!zendeskSub.trim()) {
          setError(t("actions.errorZendeskSub"));
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
              ? showAdvanced
                ? t("actions.errorSetEnv", { env: data.missingEnv.join(", ") })
                : t("actions.errorNotAvailable")
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
        setError(data.error ?? t("actions.errorSaveCredentials"));
        return;
      }
      if (data.rental) onConnected(data.rental.connectedConnectors);
      await refreshStatus();
    } finally {
      setBusy(null);
    }
  }

  const recommendedIds = (() => {
    if (isWorkflow) return new Set(["google_calendar", "slack"]);
    const flagged = connectors.filter((c) => c.recommended).map((c) => c.id);
    if (flagged.length) return new Set(flagged);
    return new Set(
      ["slack", "google_calendar", "email", "calendly"].filter((id) =>
        connectors.some((c) => c.id === id),
      ),
    );
  })();
  const primaryConnectors = connectors.filter((c) => recommendedIds.has(c.id));
  const otherPhase1 = connectors.filter((c) => c.phase === 1 && !recommendedIds.has(c.id));
  const phase2 = connectors.filter((c) => c.phase === 2);

  function row(c: Connector, opts?: { operatorDetail?: boolean }) {
    const operatorDetail = Boolean(opts?.operatorDetail);
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
              {(c.recommended || recommendedIds.has(c.id)) && (
                <span className="chip chip-live">{t("actions.recommended")}</span>
              )}
              {on && <span className="chip chip-live">{t("actions.connected")}</span>}
              {isOauth && configured && !on && <span className="chip chip-live">{t("actions.ready")}</span>}
              {isOauth && !configured && (
                <span className="chip">
                  {operatorDetail ? t("actions.envMissing") : t("actions.unavailable")}
                </span>
              )}
              {isOauth && <span className="chip">{t("actions.oauth")}</span>}
            </div>
            <p className="text-xs text-[var(--muted)]">{c.description}</p>
            {isOauth && !configured ? (
              operatorDetail && oauth?.missingEnv?.length ? (
                <p className="mt-1 font-mono text-[11px] text-[var(--warn)]">
                  {t("actions.setEnv", { env: oauth.missingEnv.join(" + ") })}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {t("actions.unavailableSandbox")}
                </p>
              )
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
                      ? operatorDetail
                        ? t("actions.configureEnvFirst", {
                            env: (oauth?.missingEnv ?? []).join(", "),
                          })
                        : t("actions.notAvailableSandbox")
                      : undefined
                  }
                  onClick={() => startOAuth(c.id)}
                >
                  {!configured
                    ? operatorDetail
                      ? t("actions.addCredentials")
                      : t("actions.unavailable")
                    : on
                      ? t("actions.reconnect")
                      : t("actions.connectOAuth")}
                </button>
                {on && (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={busy === c.id}
                    onClick={() => disconnect(c.id)}
                  >
                    {t("actions.disconnect")}
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
                {slackChannels.length === 0 && (
                  <option value="">{t("actions.loadingChannels")}</option>
                )}
                {slackChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.is_private ? t("actions.slackPrivate") : "#"}
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
                {slackSavedChannel === slackChannel ? t("actions.saved") : t("actions.setHandoff")}
              </button>
            </div>
            {slackSavedChannel && (
              <p className="text-xs text-[var(--muted)]">
                {t("actions.handoffsGoTo")}{" "}
                <code>
                  {slackChannels.find((ch) => ch.id === slackSavedChannel)?.name ??
                    slackSavedChannel}
                </code>
                {slackNeedsInvite && <> {t("actions.slackInviteHint")}</>}
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
              {t("actions.saveWebhook")}
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
              {t("actions.saveMcp")}
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
              {t("actions.saveWhatsApp")}
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
              {t("actions.saveStripe")}
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
              {t("actions.saveWoo")}
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
        <h2 className="text-sm font-semibold">{t("actions.recommendedHeading")}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("actions.recommendedLede", {
            sandbox: t("actions.sandbox"),
            live: t("actions.live"),
          })}
          {isWorkflow ? (
            <>
              {" "}
              {t("actions.workflowDemoHint", {
                calendar: t("actions.googleCalendar"),
                slack: t("actions.slack"),
              })}
            </>
          ) : null}
        </p>
        <div className="mt-4 grid gap-2">
          {(primaryConnectors.length ? primaryConnectors : connectors.filter((c) => c.phase === 1).slice(0, 4)).map(
            (c) => row(c),
          )}
        </div>
      </div>

      <div className="panel p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <span>
            <span className="text-sm font-semibold">{t("actions.advancedTitle")}</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {t("actions.advancedSub")}
              {missingCount > 0 ? t("actions.missingEnv", { count: missingCount }) : ""}
            </span>
          </span>
          <span className="text-xs text-[var(--muted)]">
            {showAdvanced ? t("actions.hide") : t("actions.show")}
          </span>
        </button>
        {showAdvanced ? (
          <div className="mt-4 space-y-4">
            {callbackUrl ? (
              <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2 text-xs">
                <p className="font-medium text-[var(--text)]">{t("actions.redirectUri")}</p>
                <code className="mt-1 block break-all text-[var(--accent-bright)]">{callbackUrl}</code>
                {missingCount > 0 ? (
                  <p className="mt-2 text-[var(--muted)]">
                    {t("actions.connectorsNeedCreds", { count: missingCount })}
                  </p>
                ) : (
                  <p className="mt-2 text-[var(--accent)]">{t("actions.allOAuthConfigured")}</p>
                )}
              </div>
            ) : null}
            {otherPhase1.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("actions.morePhase1")}
                </h3>
                <div className="grid gap-2">
                  {otherPhase1.map((c) => row(c, { operatorDetail: true }))}
                </div>
              </div>
            ) : null}
            {phase2.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("actions.phase2")}
                </h3>
                <div className="grid gap-2">
                  {phase2.map((c) => row(c, { operatorDetail: true }))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
