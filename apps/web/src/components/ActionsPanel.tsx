"use client";

import { useEffect, useMemo, useState } from "react";
import { isWorkflowFamilyId } from "@/lib/workflows";
import { useT } from "@/lib/locale";
import { BUSINESS_CONNECTORS } from "@/lib/connectors-catalog";
import { getBusinessProblemForAgent } from "@/lib/knowledge-guidance";
import { getConnectorIcon } from "@/lib/connector-icons";

function ConnectorBrandIcon({ id, className = "h-5 w-5" }: { id: string; className?: string }) {
  const iconMeta = getConnectorIcon(id);
  if (iconMeta.svgPath) {
    return (
      <img
        src={iconMeta.svgPath}
        alt={iconMeta.label}
        className={`${className} object-contain transition-transform duration-200 group-hover:scale-105`}
        loading="lazy"
      />
    );
  }
  return <span className="text-base select-none">{iconMeta.emojiFallback}</span>;
}

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
  agentCategory,
  connectors,
  connected,
  onConnected,
  agentConnectors = [],
  isCustom = false,
  onProceedToSandbox,
  onSkip,
}: {
  agentId: string;
  agentName?: string;
  agentCategory?: string;
  connectors: Connector[];
  connected: string[];
  onConnected: (ids: string[]) => void;
  agentConnectors?: string[];
  isCustom?: boolean;
  onProceedToSandbox?: () => void;
  onSkip?: () => void;
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
  
  // Clean UI toggles & Modal state
  const [configuringConnectorId, setConfiguringConnectorId] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testStatus, setTestStatus] = useState<
    Record<string, { ok: boolean; message: string; latencyMs?: number; account?: string }>
  >({});

  void isCustom;
  void slackNeedsInvite;
  void setSlackNeedsInvite;

  const byId = useMemo(() => new Map(status.map((s) => [s.id, s])), [status]);
  const slackConnected = Boolean(byId.get("slack")?.connected) || connected.includes("slack");
  const isWorkflow = isWorkflowFamilyId(agentId);

  // Business Problem Area mapping for this agent
  const problemArea = useMemo(() => {
    return getBusinessProblemForAgent(agentId, agentName, agentCategory);
  }, [agentId, agentName, agentCategory]);

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
      if (configuringConnectorId === connectorId) {
        setConfiguringConnectorId(null);
      }
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
      setConfiguringConnectorId(null);
    } finally {
      setBusy(null);
    }
  }

  async function testConnector(connectorId: string) {
    setBusy(`test-${connectorId}`);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch(`/api/oauth/${connectorId}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const latencyMs = Math.max(16, Math.round(performance.now() - start));
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus((prev) => ({
          ...prev,
          [connectorId]: {
            ok: true,
            latencyMs,
            account: data.account,
            message: data.account ? `Verified: ${data.account}` : "Active & verified with vendor",
          },
        }));
      } else {
        if (
          (data.error === "not_connected" || data.error === "probe_not_supported") &&
          connected.includes(connectorId)
        ) {
          setTestStatus((prev) => ({
            ...prev,
            [connectorId]: {
              ok: true,
              latencyMs,
              message: "Active in Sandbox (Simulated mock probe)",
            },
          }));
        } else {
          setTestStatus((prev) => ({
            ...prev,
            [connectorId]: {
              ok: false,
              latencyMs,
              message: data.error ? `Verification failed: ${data.error}` : "Probe failed — re-auth needed",
            },
          }));
        }
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

  // Determine smart recommendations based on agent's business area
  const domainRecommendedIds = useMemo(() => {
    if (/agentic-commerce|shopping|commerce/i.test(agentId)) {
      return new Set(["shopify", "stripe", "webhook", "slack"]);
    }
    if (isWorkflow) return new Set(["google_calendar", "slack", "hubspot", "email"]);
    
    // Check explicit agentConnectors first
    if (agentConnectors && agentConnectors.length > 0) {
      return new Set(agentConnectors);
    }

    const set = new Set<string>();
    const pid = problemArea.id;

    if (pid === "commerce") {
      set.add("shopify");
      set.add("stripe");
      set.add("webhook");
      set.add("slack");
    } else if (pid === "education") {
      set.add("hubspot");
      set.add("google_calendar");
      set.add("email");
      set.add("slack");
    } else if (pid === "sales") {
      set.add("hubspot");
      set.add("google_calendar");
      set.add("slack");
      set.add("email");
    } else if (pid === "bookings") {
      set.add("google_calendar");
      set.add("m365_calendar");
      set.add("calendly");
      set.add("whatsapp");
    } else if (pid === "finance") {
      set.add("stripe");
      set.add("xero");
      set.add("quickbooks");
      set.add("email");
    } else if (pid === "support") {
      set.add("zendesk");
      set.add("slack");
      set.add("email");
    } else if (pid === "developer" || pid === "operations") {
      set.add("slack");
      set.add("webhook");
      set.add("mcp");
    } else {
      // Default general business
      set.add("email");
      set.add("google_calendar");
      set.add("slack");
      set.add("whatsapp");
    }

    return set;
  }, [isWorkflow, agentConnectors, problemArea.id, agentId]);

  function isConnected(c: Connector): boolean {
    const oauth = byId.get(c.id);
    return connected.includes(c.id) || Boolean(oauth?.connected);
  }

  // Developer protocols (MCP, Webhook) kept cleanly grouped
  const isDevProtocol = (id: string) => id === "mcp" || id === "webhook";

  // Business connectors vs Dev protocols
  const allBusinessConnectors = connectors.filter((c) => !isDevProtocol(c.id));

  // Sort: Connected first, then domain recommended, then alphabetical
  function sortConnectors(list: Connector[]): Connector[] {
    return [...list].sort((a, b) => {
      const aConn = isConnected(a) ? 0 : 1;
      const bConn = isConnected(b) ? 0 : 1;
      if (aConn !== bConn) return aConn - bConn;

      const aRec = domainRecommendedIds.has(a.id) ? 0 : 1;
      const bRec = domainRecommendedIds.has(b.id) ? 0 : 1;
      if (aRec !== bRec) return aRec - bRec;

      return a.name.localeCompare(b.name);
    });
  }

  const primaryConnectors = sortConnectors(
    allBusinessConnectors.filter((c) => domainRecommendedIds.has(c.id) || isConnected(c))
  );

  const moreConnectors = sortConnectors(
    allBusinessConnectors.filter((c) => !domainRecommendedIds.has(c.id) && !isConnected(c))
  );

  const totalConnectedCount = connectors.filter((c) => isConnected(c)).length;

  // Active connector being configured in modal
  const activeModalConnector = configuringConnectorId
    ? connectors.find((c) => c.id === configuringConnectorId)
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner: Clear, uncluttered title + Quick Actions */}
      <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--bg-panel)] via-[color-mix(in_srgb,var(--bg-elev)_80%,transparent)] to-[var(--bg-panel)] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚡</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Connect Business Tools for {agentName || "this Agent"}
              </h2>
              <span
                className={`chip !text-[11px] font-semibold ${
                  totalConnectedCount > 0 ? "chip-live" : "chip-gray"
                }`}
              >
                {totalConnectedCount > 0
                  ? `${totalConnectedCount} Active`
                  : "All Simulated in Sandbox"}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] max-w-2xl leading-relaxed">
              Equip your agent with direct access to your calendar, CRM, messaging, or email. In the
              Sandbox, all tool calls are safely simulated so you can test immediately without live credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="btn btn-ghost text-xs px-3.5 py-2 text-[var(--muted)] hover:text-white border border-transparent hover:border-[var(--line)]"
              >
                Skip for now
              </button>
            ) : null}
            {onProceedToSandbox ? (
              <button
                type="button"
                onClick={onProceedToSandbox}
                className="btn btn-primary text-xs px-4 py-2 inline-flex items-center gap-2 shadow-glow-sm"
              >
                <span>Continue to Test</span>
                <span>→</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-4 py-3 text-xs text-[var(--danger)] flex items-center justify-between gap-2">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[var(--muted)] hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Recommended Business Integrations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{problemArea.icon}</span>
              <span>Recommended for {problemArea.title.replace(/^\d+\.\s*/, "")}</span>
            </h3>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Curated tools aligned to solve: {problemArea.problems[0]}
            </p>
          </div>
        </div>

        {/* Bento Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {primaryConnectors.map((c) => {
            const on = isConnected(c);
            const oauth = byId.get(c.id);
            const isOauth = Boolean(oauth) || c.auth === "oauth";
            const configured = oauth ? oauth.configured : true;
            const biz = BUSINESS_CONNECTORS.find((b) => b.id === c.id);
            const authBadge =
              biz?.authBadge ??
              (isOauth ? "OAuth 2.0" : c.auth === "api_key" ? "API Key" : "Direct");

            return (
              <div
                key={c.id}
                className={`relative rounded-xl border p-4 sm:p-5 transition-all flex flex-col justify-between ${
                  on
                    ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] to-transparent shadow-[0_4px_20px_-8px_rgba(16,185,129,0.15)]"
                    : "border-[var(--line)] bg-[var(--bg-panel)] hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elev)] border border-white/10 shadow-sm p-2">
                        <ConnectorBrandIcon id={c.id} className="h-6 w-6" />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{biz?.name ?? c.name}</h4>
                        <span className="text-[10px] font-mono text-[var(--muted)]">
                          {authBadge}
                        </span>
                      </div>
                    </div>

                    {on ? (
                      <span className="chip chip-live flex items-center gap-1 text-[11px]">
                        <span>●</span>
                        <span>Connected</span>
                      </span>
                    ) : (
                      <span className="chip chip-gray text-[10px]">Ready to Connect</span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2 mb-4">
                    {biz?.description ?? c.description}
                  </p>
                </div>

                {/* Diagnostic Test Status Banner */}
                {testStatus[c.id] ? (
                  <div
                    className={`mt-2 mb-3 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 border transition-all ${
                      testStatus[c.id].ok
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{testStatus[c.id].ok ? "✓" : "⚠"}</span>
                      <span className="truncate font-medium">{testStatus[c.id].message}</span>
                    </span>
                    {testStatus[c.id].latencyMs ? (
                      <span className="shrink-0 font-mono text-[10px] text-white/70 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
                        ⚡ {testStatus[c.id].latencyMs}ms
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Card Actions */}
                <div className="pt-3 border-t border-[var(--line)]/60 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--muted)]">
                    {on ? "Connected & active" : "Ready to connect"}
                  </span>

                  <div className="flex items-center gap-2">
                    {on ? (
                      <>
                        <button
                          type="button"
                          disabled={busy === `test-${c.id}`}
                          onClick={() => void testConnector(c.id)}
                          className="btn btn-ghost text-xs min-h-[36px] px-3 py-1.5 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5 active:scale-95 transition-all"
                          title="Ping integration endpoint and measure latency"
                        >
                          {busy === `test-${c.id}` ? (
                            <>
                              <span
                                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"
                                aria-hidden
                              />
                              <span>Testing…</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>Test Ping</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() => void disconnect(c.id)}
                          className="min-h-[36px] text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : isOauth && configured ? (
                      <button
                        type="button"
                        disabled={busy === c.id}
                        onClick={() => void startOAuth(c.id)}
                        className="btn btn-primary text-xs min-h-[36px] px-3.5 py-1.5 font-medium shadow-sm active:scale-95 transition-transform"
                      >
                        {busy === c.id ? "Connecting…" : "Connect Account"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfiguringConnectorId(c.id)}
                        className="btn btn-ghost text-xs min-h-[36px] px-3.5 py-1.5 border border-[var(--line)] hover:border-white/30 text-white font-medium active:scale-95 transition-transform"
                      >
                        Configure / Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Integrations: Clean Accordion */}
      {moreConnectors.length > 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
            onClick={() => setShowOther((v) => !v)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-white">More Business Integrations</span>
              <span className="chip chip-gray text-[10px]">+{moreConnectors.length} more</span>
            </div>
            <span className="text-xs text-[var(--muted)] font-medium">
              {showOther ? "▲ Collapse" : "▼ Browse All"}
            </span>
          </button>

          {showOther && (
            <div className="p-4 pt-0 border-t border-[var(--line)]/60 grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {moreConnectors.map((c) => {
                const on = isConnected(c);
                const oauth = byId.get(c.id);
                const isOauth = Boolean(oauth) || c.auth === "oauth";
                const configured = oauth ? oauth.configured : true;
                const biz = BUSINESS_CONNECTORS.find((b) => b.id === c.id);

                return (
                  <div
                    key={c.id}
                    className="rounded-lg border border-[var(--line)]/60 bg-[var(--bg-elev)]/40 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elev)] border border-white/10 shadow-sm p-1.5">
                        <ConnectorBrandIcon id={c.id} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{biz?.name ?? c.name}</p>
                        <p className="text-[11px] text-[var(--muted)] truncate">{c.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {on ? (
                        <span className="chip chip-live text-[10px]">Connected</span>
                      ) : isOauth && configured ? (
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() => void startOAuth(c.id)}
                          className="btn btn-primary text-xs px-2.5 py-1"
                        >
                          Connect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfiguringConnectorId(c.id)}
                          className="btn btn-ghost text-xs px-2.5 py-1 border border-[var(--line)]"
                        >
                          Setup
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Advanced Developer Accordion (MCP & Webhooks) */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Developer Protocols & Custom MCP</span>
              <span className="chip chip-gray text-[10px]">Advanced</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Connect private Model Context Protocol (MCP) servers or enterprise outbound HTTP webhooks.
            </p>
          </div>
          <span className="text-xs text-[var(--muted)] font-medium">
            {showAdvanced ? "▲ Hide" : "▼ Expand"}
          </span>
        </button>

        {showAdvanced && (
          <div className="p-4 pt-0 border-t border-[var(--line)]/60 space-y-4 mt-3">
            {/* MCP Configuration */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔌</span>
                  <span className="text-xs font-bold text-white">Model Context Protocol (MCP) Bridge</span>
                </div>
                {isConnected({ id: "mcp" } as Connector) && (
                  <span className="chip chip-live text-[10px]">Active</span>
                )}
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Connect an HTTP MCP endpoint to expose custom tools and internal APIs to this agent.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input text-xs"
                  placeholder="https://mcp.your-domain.com"
                  value={mcpEndpoint}
                  onChange={(e) => setMcpEndpoint(e.target.value)}
                />
                <input
                  className="input text-xs"
                  placeholder="Bearer token (optional)"
                  value={mcpToken}
                  onChange={(e) => setMcpToken(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy === "mcp" || !mcpEndpoint}
                  onClick={() =>
                    void saveCredentials("mcp", { endpoint: mcpEndpoint, token: mcpToken })
                  }
                  className="btn btn-primary text-xs px-3 py-1.5"
                >
                  Save MCP Connection
                </button>
                <button
                  type="button"
                  onClick={() => void simulateConnect("mcp")}
                  className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                >
                  Simulate Demo MCP
                </button>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="text-xs font-bold text-white">Custom Outbound Webhook</span>
                </div>
                {isConnected({ id: "webhook" } as Connector) && (
                  <span className="chip chip-live text-[10px]">Active</span>
                )}
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Dispatch signed JSON payloads to your ERP or server whenever the agent takes an action.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input text-xs"
                  placeholder="https://api.your-company.com/events"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <input
                  className="input text-xs"
                  placeholder="Shared secret / HMAC key"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={busy === "webhook" || !webhookUrl}
                onClick={() =>
                  void saveCredentials("webhook", {
                    url: webhookUrl,
                    secret: webhookSecret || "miai",
                  })
                }
                className="btn btn-primary text-xs px-3 py-1.5"
              >
                Save Webhook URL
              </button>
            </div>

            {/* OAuth Callback Info */}
            {callbackUrl && (
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs space-y-1">
                <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider">
                  OAuth Redirect URI (For Vendor Consoles)
                </span>
                <code className="block text-[11px] text-[var(--accent-bright)] font-mono break-all select-all">
                  {callbackUrl}
                </code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sandbox Callout */}
      <div className="rounded-2xl border border-[var(--accent)]/30 bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_12%,transparent)] to-transparent p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <span>🧪</span>
            <span>Ready to test without configuring live accounts?</span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            You can skip directly to the Sandbox. All actions will return safe, realistic simulated responses.
          </p>
        </div>
        {onProceedToSandbox && (
          <button
            type="button"
            onClick={onProceedToSandbox}
            className="btn btn-primary text-xs px-4 py-2 shrink-0 inline-flex items-center gap-1.5 shadow-glow-sm"
          >
            <span>Go to Sandbox Chat</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Clean Modal for Configuring Individual Connectors */}
      {activeModalConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elev)] border border-white/10 shadow-sm p-2">
                  <ConnectorBrandIcon id={activeModalConnector.id} className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{activeModalConnector.name}</h3>
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    Configure Integration
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringConnectorId(null)}
                className="text-[var(--muted)] hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {activeModalConnector.id === "whatsapp" ? (
                <div className="space-y-3">
                  <p className="text-[var(--muted)]">
                    Enter Meta Cloud API credentials or connect a simulated sandbox channel.
                  </p>
                  <input
                    className="input text-xs w-full"
                    placeholder="Cloud API permanent token"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                  />
                  <input
                    className="input text-xs w-full"
                    placeholder="Phone number ID"
                    value={whatsappPhoneId}
                    onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect("whatsapp")}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Connect Demo Sandbox
                    </button>
                    <button
                      type="button"
                      disabled={busy === "whatsapp"}
                      onClick={() =>
                        void saveCredentials("whatsapp", {
                          api_key: whatsappToken || "demo-token",
                          phone_number_id: whatsappPhoneId || "demo-id",
                        })
                      }
                      className="btn btn-primary text-xs px-4 py-1.5"
                    >
                      Save Token
                    </button>
                  </div>
                </div>
              ) : activeModalConnector.id === "stripe" ? (
                <div className="space-y-3">
                  <p className="text-[var(--muted)]">
                    Enter your Stripe secret key (sk_test_… or sk_live_…) for invoice drafting and payment links.
                  </p>
                  <input
                    className="input text-xs w-full font-mono"
                    placeholder="sk_test_…"
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect("stripe")}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Use Demo Stripe
                    </button>
                    <button
                      type="button"
                      disabled={busy === "stripe" || !stripeKey}
                      onClick={() => void saveCredentials("stripe", { api_key: stripeKey })}
                      className="btn btn-primary text-xs px-4 py-1.5"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              ) : activeModalConnector.id === "shopify" ? (
                <div className="space-y-3">
                  <p className="text-[var(--muted)]">
                    Enter your myshopify.com domain to initiate Shopify store OAuth.
                  </p>
                  <input
                    className="input text-xs w-full"
                    placeholder="your-store.myshopify.com"
                    value={shop}
                    onChange={(e) => setShop(e.target.value)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect("shopify")}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Demo Store
                    </button>
                    <button
                      type="button"
                      disabled={busy === "shopify" || !shop}
                      onClick={() => void startOAuth("shopify")}
                      className="btn btn-primary text-xs px-4 py-1.5"
                    >
                      Authorize Shopify
                    </button>
                  </div>
                </div>
              ) : activeModalConnector.id === "zendesk" ? (
                <div className="space-y-3">
                  <p className="text-[var(--muted)]">
                    Enter your Zendesk subdomain (e.g. acme for acme.zendesk.com).
                  </p>
                  <input
                    className="input text-xs w-full"
                    placeholder="subdomain"
                    value={zendeskSub}
                    onChange={(e) => setZendeskSub(e.target.value)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect("zendesk")}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Demo Desk
                    </button>
                    <button
                      type="button"
                      disabled={busy === "zendesk" || !zendeskSub}
                      onClick={() => void startOAuth("zendesk")}
                      className="btn btn-primary text-xs px-4 py-1.5"
                    >
                      Authorize Zendesk
                    </button>
                  </div>
                </div>
              ) : activeModalConnector.id === "email" ? (
                <div className="space-y-3">
                  <p className="text-[var(--muted)]">Choose your email provider to connect:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailProvider("google")}
                      className={`flex-1 p-3 rounded-xl border text-center font-medium ${
                        emailProvider === "google"
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-white"
                          : "border-[var(--line)] text-[var(--muted)]"
                      }`}
                    >
                      Google / Gmail
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailProvider("microsoft")}
                      className={`flex-1 p-3 rounded-xl border text-center font-medium ${
                        emailProvider === "microsoft"
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-white"
                          : "border-[var(--line)] text-[var(--muted)]"
                      }`}
                    >
                      Microsoft 365
                    </button>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect("email")}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Demo Account
                    </button>
                    <button
                      type="button"
                      onClick={() => void startOAuth("email")}
                      className="btn btn-primary text-xs px-4 py-1.5"
                    >
                      Sign In & Authorize
                    </button>
                  </div>
                </div>
              ) : activeModalConnector.id === "woocommerce" ? (
                <div className="space-y-3">
                  <input
                    className="input text-xs w-full"
                    placeholder="https://shop.example.com"
                    value={wooUrl}
                    onChange={(e) => setWooUrl(e.target.value)}
                  />
                  <input
                    className="input text-xs w-full"
                    placeholder="Consumer key (ck_…)"
                    value={wooKey}
                    onChange={(e) => setWooKey(e.target.value)}
                  />
                  <input
                    className="input text-xs w-full"
                    placeholder="Consumer secret (cs_…)"
                    value={wooSecret}
                    onChange={(e) => setWooSecret(e.target.value)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect("woocommerce")}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Demo Store
                    </button>
                    <button
                      type="button"
                      disabled={busy === "woocommerce" || !wooUrl}
                      onClick={() =>
                        void saveCredentials("woocommerce", {
                          store_url: wooUrl,
                          consumer_key: wooKey,
                          consumer_secret: wooSecret,
                        })
                      }
                      className="btn btn-primary text-xs px-4 py-1.5"
                    >
                      Save Keys
                    </button>
                  </div>
                </div>
              ) : activeModalConnector.id === "slack" ? (
                <div className="space-y-3">
                  {slackConnected ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-white">Select Handoff Channel</p>
                      <select
                        className="input w-full text-xs"
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                      >
                        {slackChannels.length === 0 && <option value="">Loading channels…</option>}
                        {slackChannels.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.is_private ? "🔒 " : "# "}
                            {ch.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy === "slack-channel" || !slackChannel}
                        onClick={() => void saveSlackChannel()}
                        className="btn btn-primary text-xs px-3 py-1.5 w-full"
                      >
                        {slackSavedChannel === slackChannel ? "Saved Handoff Channel" : "Save Channel"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[var(--muted)]">
                        Add this agent to your Slack workspace to route lead alerts and escalations.
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => void simulateConnect("slack")}
                          className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                        >
                          Connect Demo Slack
                        </button>
                        {byId.get("slack")?.configured && (
                          <button
                            type="button"
                            onClick={() => void startOAuth("slack")}
                            className="btn btn-primary text-xs px-4 py-1.5"
                          >
                            Add to Slack
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[var(--muted)]">
                    Connect {activeModalConnector.name} for live actions or enable simulated demo mode in the Sandbox.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void simulateConnect(activeModalConnector.id)}
                      className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--line)]"
                    >
                      Connect in Demo Mode
                    </button>
                    {byId.get(activeModalConnector.id)?.configured && (
                      <button
                        type="button"
                        onClick={() => void startOAuth(activeModalConnector.id)}
                        className="btn btn-primary text-xs px-4 py-1.5"
                      >
                        Authorize Live
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
