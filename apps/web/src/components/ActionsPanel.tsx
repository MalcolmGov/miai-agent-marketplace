"use client";

import { useEffect, useMemo, useState } from "react";
import { isWorkflowFamilyId } from "@/lib/workflows";
import { useT } from "@/lib/locale";
import { BUSINESS_CONNECTORS } from "@/lib/connectors-catalog";

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
  agentName,
  connectors,
  connected,
  onConnected,
  agentConnectors = [],
  isCustom = false,
  onProceedToSandbox,
}: {
  agentId: string;
  agentName?: string;
  connectors: Connector[];
  connected: string[];
  onConnected: (ids: string[]) => void;
  agentConnectors?: string[];
  isCustom?: boolean;
  onProceedToSandbox?: () => void;
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
  const [showOther, setShowOther] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { ok: boolean; message: string }>>({});

  void isCustom;

  const byId = useMemo(() => new Map(status.map((s) => [s.id, s])), [status]);
  const slackConnected = Boolean(byId.get("slack")?.connected) || connected.includes("slack");
  const missingCount = status.filter((s) => !s.configured).length;
  const isWorkflow = isWorkflowFamilyId(agentId);

  async function simulateConnect(connectorId: string) {
    setBusy(connectorId);
    setError(null);
    try {
      const res = await fetch("/api/connectors/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId,
          connectorId,
          config: { api_key: "demo-sandbox-token", simulated: "true" },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("actions.errorSaveCredentials"));
        return;
      }
      if (data.rental) onConnected(data.rental.connectedConnectors);
      await refreshStatus();
    } catch {
      setError("Network error while connecting demo account");
    } finally {
      setBusy(null);
    }
  }

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
        returnTo: `/agents/${agentId}?step=connect`,
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
      setTestStatus((prev) => {
        const next = { ...prev };
        delete next[connectorId];
        return next;
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

  async function testConnector(connectorId: string) {
    setBusy(`test-${connectorId}`);
    setError(null);
    try {
      const res = await fetch(`/api/oauth/${connectorId}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus((prev) => ({
          ...prev,
          [connectorId]: {
            ok: true,
            message: data.account ? `Verified: ${data.account}` : "Active & verified with vendor",
          },
        }));
      } else {
        setTestStatus((prev) => ({
          ...prev,
          [connectorId]: {
            ok: false,
            message: data.error ? `Verification failed: ${data.error}` : "Probe failed — re-auth needed",
          },
        }));
      }
    } catch {
      setTestStatus((prev) => ({
        ...prev,
        [connectorId]: {
          ok: false,
          message: "Network error running live probe",
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  const recommendedIds = (() => {
    if (isWorkflow) return new Set(["google_calendar", "slack", "hubspot", "email"]);
    const flagged = connectors.filter((c) => c.recommended).map((c) => c.id);
    if (flagged.length) return new Set(flagged);
    return new Set(
      ["slack", "google_calendar", "email", "calendly", "hubspot"].filter((id) =>
        connectors.some((c) => c.id === id),
      ),
    );
  })();

  const equippedIds = useMemo(() => {
    if (agentConnectors && agentConnectors.length > 0) {
      return new Set(agentConnectors);
    }
    return recommendedIds;
  }, [agentConnectors, recommendedIds]);

  function isConnected(c: Connector): boolean {
    const oauth = byId.get(c.id);
    return connected.includes(c.id) || Boolean(oauth?.connected);
  }

  function sortConnectedFirst(list: Connector[]): Connector[] {
    return [...list].sort((a, b) => {
      const ac = isConnected(a) ? 0 : 1;
      const bc = isConnected(b) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      const aEquipped = equippedIds.has(a.id) ? 0 : 1;
      const bEquipped = equippedIds.has(b.id) ? 0 : 1;
      if (aEquipped !== bEquipped) return aEquipped - bEquipped;
      const aReady = byId.get(a.id)?.configured !== false ? 0 : 1;
      const bReady = byId.get(b.id)?.configured !== false ? 0 : 1;
      if (aReady !== bReady) return aReady - bReady;
      return a.name.localeCompare(b.name);
    });
  }

  const equippedConnectors = sortConnectedFirst(connectors.filter((c) => equippedIds.has(c.id)));
  const otherConnectors = sortConnectedFirst(connectors.filter((c) => !equippedIds.has(c.id)));
  const connectedEquippedCount = equippedConnectors.filter((c) => isConnected(c)).length;
  const phase2 = sortConnectedFirst(connectors.filter((c) => c.phase === 2));

  const btnPrimary =
    "btn btn-primary inline-flex h-9 min-w-[8.5rem] items-center justify-center px-3 text-xs";
  const btnGhost =
    "btn btn-ghost inline-flex h-9 min-w-[8.5rem] items-center justify-center px-3 text-xs";

  function row(c: Connector, opts?: { operatorDetail?: boolean; isEquipped?: boolean }) {
    const operatorDetail = Boolean(opts?.operatorDetail);
    const isEquipped = Boolean(opts?.isEquipped);
    const oauth = byId.get(c.id);
    const isOauth = Boolean(oauth) || c.auth === "oauth";
    const on = isConnected(c);
    const configured = oauth ? oauth.configured : true;
    const recommended = c.recommended || recommendedIds.has(c.id);
    const biz = BUSINESS_CONNECTORS.find((b) => b.id === c.id);
    const icon = biz?.icon ?? (c.id.includes("calendar") ? "📅" : c.id === "slack" ? "💬" : c.id === "hubspot" ? "🟠" : "🔌");
    const authBadge = biz?.authBadge ?? (isOauth ? "OAuth 2.0" : c.auth === "api_key" ? "API Key" : "Integration");

    let actionButtonLabel = isOauth ? t("actions.connectOAuth") : "Connect";
    let brandClass = "";
    if (c.id === "google_calendar" || c.id === "google_tasks" || c.id === "google_contacts") {
      actionButtonLabel = "Sign in with Google";
      brandClass = "bg-[#4285f4] hover:bg-[#3367d6] text-white border-0 shadow-[0_0_12px_rgba(66,133,244,0.3)]";
    } else if (c.id === "hubspot") {
      actionButtonLabel = "Authorize HubSpot";
      brandClass = "bg-[#ff7a59] hover:bg-[#e06545] text-white border-0 shadow-[0_0_12px_rgba(255,122,89,0.3)]";
    } else if (c.id === "slack") {
      actionButtonLabel = "Add to Slack";
      brandClass = "bg-[#4a154b] hover:bg-[#611f69] text-white border-0 shadow-[0_0_12px_rgba(74,21,75,0.3)]";
    } else if (c.id === "whatsapp") {
      actionButtonLabel = "Configure WhatsApp";
      brandClass = "bg-[#25d366] hover:bg-[#1ebd56] text-slate-950 font-bold border-0 shadow-[0_0_12px_rgba(37,211,102,0.3)]";
    }

    return (
      <div
        key={c.id}
        className={`rounded-2xl border p-4 sm:p-5 transition-all ${
          on
            ? "border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.07] to-transparent shadow-[0_4px_20px_-8px_rgba(16,185,129,0.15)]"
            : isEquipped
              ? "border-[var(--accent)]/30 bg-[color-mix(in_srgb,var(--bg-elev)_60%,transparent)] shadow-card"
              : "border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_40%,transparent)]"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-panel)] text-sm border border-white/10 shadow-sm">
                {icon}
              </span>
              <span className="text-sm font-bold text-[var(--text)]">{biz?.name ?? c.name}</span>
              {on ? (
                <span className="chip chip-live flex items-center gap-1">
                  <span>✓</span>
                  <span>{t("actions.connected")}</span>
                </span>
              ) : isOauth && configured ? (
                <span className="chip text-[var(--accent-bright)] border-[var(--accent)]/30 bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  {t("actions.ready")}
                </span>
              ) : isOauth && !configured ? (
                <span className="chip text-amber-300 border-amber-500/30 bg-amber-500/10">
                  Pending Authorization
                </span>
              ) : null}
              <span className="chip opacity-70 text-[10px] font-mono">{authBadge}</span>
              {recommended && !on ? <span className="chip">{t("actions.recommended")}</span> : null}
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">{c.description}</p>
            {isOauth && !configured ? (
              <p className="text-[11px] text-[var(--muted)]">
                {operatorDetail && oauth?.missingEnv?.length
                  ? `Missing env keys: ${(oauth.missingEnv ?? []).join(", ")}`
                  : "Click below to connect in Sandbox demo mode or configure vendor OAuth keys."}
              </p>
            ) : null}

            {testStatus[c.id] ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                  testStatus[c.id].ok
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                <span>{testStatus[c.id].ok ? "✓" : "⚠"}</span>
                <span>{testStatus[c.id].message}</span>
              </div>
            ) : null}

            {/* Extra config sits with the copy, full width of the left column */}
            {c.id === "shopify" ? (
              <input
                className="input mt-1 max-w-md text-xs"
                placeholder="my-store.myshopify.com"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
              />
            ) : null}
            {c.id === "zendesk" ? (
              <input
                className="input mt-1 max-w-md text-xs"
                placeholder="your-subdomain"
                value={zendeskSub}
                onChange={(e) => setZendeskSub(e.target.value)}
              />
            ) : null}
            {c.id === "email" ? (
              <div className="flex flex-wrap gap-2 pt-1">
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
            ) : null}
            {c.id === "slack" && on ? (
              <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Handoff channel
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="input min-w-0 flex-1 text-xs"
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
                    className={btnPrimary}
                    disabled={busy === "slack-channel" || !slackChannel}
                    onClick={() => void saveSlackChannel()}
                  >
                    {slackSavedChannel === slackChannel
                      ? t("actions.saved")
                      : t("actions.setHandoff")}
                  </button>
                </div>
                {slackSavedChannel ? (
                  <p className="text-xs text-[var(--muted)]">
                    {t("actions.handoffsGoTo")}{" "}
                    <span className="font-semibold text-[var(--text)]">#{slackSavedChannel}</span>
                  </p>
                ) : null}
                {slackNeedsInvite ? (
                  <p className="text-xs text-[var(--warn)]">{t("actions.slackInviteHint")}</p>
                ) : null}
              </div>
            ) : null}

            {c.id === "webhook" ? (
              <div className="space-y-2">
                <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    className="input min-w-0 flex-1 text-xs"
                    placeholder="https://api.your-company.com/webhooks/miai"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <input
                    className="input w-full text-xs sm:w-44"
                    placeholder="shared secret (HMAC)"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={btnPrimary}
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
            ) : null}

            {c.id === "mcp" ? (
              <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                <input
                  className="input text-xs sm:col-span-2"
                  placeholder="https://mcp.example.com"
                  value={mcpEndpoint}
                  onChange={(e) => setMcpEndpoint(e.target.value)}
                />
                <input
                  className="input text-xs sm:col-span-2"
                  placeholder="bearer token"
                  value={mcpToken}
                  onChange={(e) => setMcpToken(e.target.value)}
                />
                <button
                  type="button"
                  className={`${btnPrimary} sm:col-span-2 sm:w-fit`}
                  disabled={busy === "mcp"}
                  onClick={() =>
                    saveCredentials("mcp", { endpoint: mcpEndpoint, token: mcpToken })
                  }
                >
                  {t("actions.saveMcp")}
                </button>
              </div>
            ) : null}

            {c.id === "whatsapp" ? (
              <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                <input
                  className="input text-xs sm:col-span-2"
                  placeholder="Cloud API permanent token"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                />
                <input
                  className="input text-xs sm:col-span-2"
                  placeholder="Phone number ID"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                />
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${btnPrimary} sm:w-fit`}
                    disabled={busy === "whatsapp"}
                    onClick={() =>
                      saveCredentials("whatsapp", {
                        api_key: whatsappToken || "demo-wa-token",
                        phone_number_id: whatsappPhoneId || "demo-wa-id",
                      })
                    }
                  >
                    {t("actions.saveWhatsApp")}
                  </button>
                  {!on ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs border border-[var(--line)]"
                      disabled={busy === "whatsapp"}
                      onClick={() => simulateConnect("whatsapp")}
                    >
                      Connect Demo WhatsApp
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {c.id === "stripe" ? (
              <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="input min-w-0 flex-1 text-xs"
                  placeholder="sk_live_… or sk_test_…"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                />
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy === "stripe"}
                  onClick={() => saveCredentials("stripe", { api_key: stripeKey })}
                >
                  {t("actions.saveStripe")}
                </button>
              </div>
            ) : null}

            {c.id === "woocommerce" ? (
              <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                <input
                  className="input text-xs sm:col-span-2"
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
                  className={`${btnPrimary} sm:col-span-2 sm:w-fit`}
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
            ) : null}
          </div>

          {/* Action column */}
          {isOauth ? (
            <div className="flex shrink-0 flex-row flex-wrap gap-2 lg:w-[12rem] lg:flex-col lg:items-stretch">
              {!on ? (
                configured ? (
                  <button
                    type="button"
                    className={`btn inline-flex h-9 min-w-[8.5rem] items-center justify-center gap-1.5 px-3 text-xs font-semibold ${brandClass || btnPrimary}`}
                    disabled={busy === c.id}
                    onClick={() => startOAuth(c.id)}
                  >
                    {busy === c.id ? "Connecting…" : actionButtonLabel}
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5 w-full">
                    <button
                      type="button"
                      className="btn btn-primary inline-flex h-9 w-full items-center justify-center gap-1.5 px-3 text-xs font-semibold shadow-glow-sm"
                      disabled={busy === c.id}
                      onClick={() => simulateConnect(c.id)}
                      title="Connect in Sandbox/Demo mode for testing without external OAuth credentials"
                    >
                      <span>⚡</span>
                      <span>{busy === c.id ? "Connecting…" : "Connect (Demo)"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(true)}
                      className="text-center text-[10px] text-[var(--muted)] hover:text-white underline pt-0.5"
                    >
                      Configure OAuth keys
                    </button>
                  </div>
                )
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost inline-flex h-9 min-w-[8.5rem] items-center justify-center gap-1.5 px-3 text-xs text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/10"
                    disabled={busy === `test-${c.id}`}
                    onClick={() => void testConnector(c.id)}
                    title="Send a live read-only ping to verify stored OAuth token"
                  >
                    <span>⚡</span>
                    <span>{busy === `test-${c.id}` ? "Pinging…" : "Test connection"}</span>
                  </button>
                  <button
                    type="button"
                    className={`${btnGhost} text-rose-400 hover:text-rose-200 hover:border-rose-500/30`}
                    disabled={busy === c.id}
                    onClick={() => disconnect(c.id)}
                  >
                    {t("actions.disconnect")}
                  </button>
                </>
              )}
            </div>
          ) : !isOauth && on ? (
            <div className="flex shrink-0 flex-row flex-wrap gap-2 lg:w-[12rem] lg:flex-col lg:items-stretch">
              <button
                type="button"
                className={`${btnGhost} text-rose-400 hover:text-rose-200 hover:border-rose-500/30`}
                disabled={busy === c.id}
                onClick={() => disconnect(c.id)}
              >
                {t("actions.disconnect")}
              </button>
            </div>
          ) : null}
        </div>
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

      {/* Primary Section: Equipped / Selected Accounts */}
      <div className="panel p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Selected Accounts for {agentName || "this Agent"}
              </h2>
              <span className="chip chip-live !text-[10px]">
                {connectedEquippedCount} / {equippedConnectors.length} Connected
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
              Authenticate your equipped apps below via 1-click OAuth or credentials so this agent can perform live actions.
            </p>
          </div>
        </div>

        {equippedConnectors.length > 0 ? (
          <div className="grid gap-3">
            {equippedConnectors.map((c) => row(c, { operatorDetail: showAdvanced, isEquipped: true }))}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)]">No specific connectors equipped for this agent.</p>
        )}

        {/* Next Step / Ready to test banner */}
        <div className="rounded-xl border border-[var(--accent)]/35 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-sm">
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🚀</span> Ready to test your agent?
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Try prompts, verify tool execution, and inspect outputs in the safe Sandbox.
            </p>
          </div>
          {onProceedToSandbox ? (
            <button
              type="button"
              onClick={onProceedToSandbox}
              className="btn btn-primary text-xs shrink-0 px-4 py-2 inline-flex items-center gap-1.5 shadow-glow-sm"
            >
              <span>Proceed to Sandbox Test</span>
              <span>→</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Secondary Collapsible Section: Other Available Integrations */}
      {otherConnectors.length > 0 ? (
        <div className="panel p-4 sm:p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setShowOther((v) => !v)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Other Available Integrations</span>
                <span className="chip chip-gray !py-0 !text-[10px]">+{otherConnectors.length} more</span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Browse and connect additional integrations across CRM, eCommerce, and billing.
              </p>
            </div>
            <span className="shrink-0 text-xs text-[var(--muted)]">
              {showOther ? "▲ Hide" : "▼ Browse"}
            </span>
          </button>

          {showOther ? (
            <div className="mt-4 grid gap-3">
              {otherConnectors.map((c) => row(c, { operatorDetail: showAdvanced }))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Advanced Developer Settings Panel */}
      <div className="panel p-4 sm:p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <span>
            <span className="text-sm font-semibold">{t("actions.advancedTitle")}</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {t("actions.advancedSub")}
              {missingCount > 0 ? t("actions.missingEnv", { count: missingCount }) : ""}
            </span>
          </span>
          <span className="shrink-0 text-xs text-[var(--muted)]">
            {showAdvanced ? t("actions.hide") : t("actions.show")}
          </span>
        </button>
        {showAdvanced ? (
          <div className="mt-4 space-y-5">
            {callbackUrl ? (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-3 text-xs">
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
            {phase2.length > 0 ? (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("actions.phase2")}
                </h3>
                <div className="grid gap-3">
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
