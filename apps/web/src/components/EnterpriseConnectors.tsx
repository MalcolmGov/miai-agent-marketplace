"use client";

/**
 * Compact "floating" connector strip for the marketplace hub.
 *
 * A slim animated marquee of the platform's REAL connector logos (packages/connectors registry)
 * — no cards, no filters, minimal height — so the page stays focused on the catalogue before a
 * visitor commits to an agent. Per-agent connection happens in the studio's Connect step.
 */

interface StripConnector {
  name: string;
  /** Brand asset in /public/icons/connectors/ when we ship one. */
  logo?: string;
  /** Text glyph fallback for platforms without a shipped logo. */
  glyph?: string;
}

const CONNECTORS: StripConnector[] = [
  { name: "Google Calendar", logo: "/icons/connectors/google-calendar.svg" },
  { name: "Microsoft 365", logo: "/icons/connectors/microsoft.svg" },
  { name: "Microsoft Teams", logo: "/icons/connectors/microsoft-teams.svg" },
  { name: "Gmail", logo: "/icons/connectors/gmail.svg" },
  { name: "HubSpot", logo: "/icons/connectors/hubspot.svg" },
  { name: "Slack", logo: "/icons/connectors/slack.svg" },
  { name: "Zendesk", logo: "/icons/connectors/zendesk.svg" },
  { name: "Shopify", logo: "/icons/connectors/shopify.svg" },
  { name: "WooCommerce", logo: "/icons/connectors/woocommerce.svg" },
  { name: "Stripe", logo: "/icons/connectors/stripe.svg" },
  { name: "Xero", logo: "/icons/connectors/xero.svg" },
  { name: "QuickBooks", logo: "/icons/connectors/quickbooks.svg" },
  { name: "Calendly", logo: "/icons/connectors/calendly.svg" },
  { name: "WhatsApp", logo: "/icons/connectors/whatsapp.svg" },
  { name: "Notion", logo: "/icons/connectors/notion.svg" },
  { name: "MCP server", glyph: "🧩" },
  { name: "Webhook", glyph: "🔗" },
];

export function EnterpriseConnectors() {
  // Two identical halves → translateX(-50%) gives a seamless infinite loop.
  const halves = [0, 1];
  return (
    <section id="connectors" className="scroll-mt-24 space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#00D2FF]/30 bg-[#00D2FF]/15 text-sm"
            >
              🔌
            </span>
            Enterprise Connectors
          </h2>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
            Certified Toolsets
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline">
            OAuth 2.0 · API keys · Webhooks · MCP — connected per agent in the studio
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            <b>{CONNECTORS.length} integrations</b> · All systems operational
          </span>
        </div>
      </div>

      <div className="mct-strip" role="list" aria-label="Supported enterprise connectors">
        <div className="mct-track">
          {halves.map((half) => (
            <div key={half} className="flex" aria-hidden={half === 1}>
              {CONNECTORS.map((c) => (
                <div
                  key={`${half}-${c.name}`}
                  role="listitem"
                  className="mct-tile"
                  title={c.name}
                  aria-label={half === 0 ? c.name : undefined}
                >
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tiny static brand SVGs, no optimization needed
                    <img src={c.logo} alt="" loading="lazy" />
                  ) : (
                    <span className="mct-glyph" aria-hidden>
                      {c.glyph}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
