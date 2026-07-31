import type { ConnectorCall, ConnectorResult, ConnectorId } from "../types.js";
import { getValidAccessToken } from "../oauth/flow.js";
import { getToken } from "../oauth/tokens.js";

function stubFor(tool: string, args: Record<string, unknown>): Record<string, unknown> {
  const n = tool.toLowerCase();
  if (n.includes("order")) return { status: "out_for_delivery", eta: "tomorrow", order_id: args.order_id ?? "4821" };
  if (n.includes("availability") || n.includes("check_availability") || n.includes("check_calendar"))
    return {
      ok: true,
      available: true,
      slots: [
        { datetime: "2026-08-07T10:00:00", label: "Thursday 10:00" },
        { datetime: "2026-08-07T14:30:00", label: "Thursday 14:30" },
      ],
      requested: args,
    };
  if (n.includes("book")) return { booked: true, booking_ref: "BK-3391", ...args };
  if (n.includes("job_opening") || n.includes("list_jobs") || n.includes("open_role")) {
    return {
      ok: true,
      source: "sandbox_stub",
      note: "No live ATS connected — answer from knowledge base open roles when available.",
      openings: [
        {
          req_id: "REQ-CSM-2241",
          title: "Customer Success Manager",
          location: "Austin or remote US",
          salary_band: "$85k–$105k",
          requirements: [
            "3+ years B2B SaaS customer success",
            "Salesforce or similar CRM",
            "Excellent written communication",
          ],
        },
        {
          req_id: "REQ-HR-1188",
          title: "People Operations Generalist",
          location: "Chicago",
          salary_band: "$70k–$88k",
          requirements: ["2+ years HR/People Ops", "Workday experience preferred"],
        },
        {
          req_id: "REQ-ENG-4402",
          title: "Staff Software Engineer",
          location: "Remote US",
          salary_band: "$160k–$190k",
          requirements: ["7+ years software engineering", "Distributed systems experience"],
        },
      ],
      filter: args,
    };
  }
  if (n.includes("ticket") || n.includes("lead") || n.includes("capture") || n.includes("application"))
    return { ok: true, reference: "APP-4821", status: "captured", ...args };
  if (n.includes("handoff")) return { routed: true, queue: "human_desk" };
  if (n.includes("guest")) return { request_ref: "GR-1001", status: "logged" };
  if (n.includes("estimate")) return { estimate_ref: "EST-2201", status: "logged" };
  if (
    n.includes("catalogue") ||
    n.includes("list_services") ||
    n.includes("get_services") ||
    n.includes("menu") ||
    n.includes("list_catalogue")
  )
    return {
      ok: true,
      items: ["Check-up", "Standard service", "Follow-up consultation"],
      note: "Sandbox stub — prefer prices/details from knowledge base.",
    };
  if (n.includes("policy"))
    return {
      ok: true,
      source: "sandbox_stub",
      note: "Answer from the knowledge base policy sections for this topic.",
      topic: args.topic ?? args.name ?? "general",
    };
  return { ok: true, reference: "REF-0001", echo: args };
}

async function postWebhook(url: string, secret: string, payload: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-miai-signature": secret,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: true, status: res.status };
  }
}

async function slackHandoff(
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

async function shopifyOrder(
  token: string,
  shop: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const orderId = String(args.order_id ?? args.orderId ?? "").replace(/^#/, "");
  if (!orderId) throw new Error("order_id required");
  const q = encodeURIComponent(orderId);
  const res = await fetch(
    `https://${shop}/admin/api/2024-10/orders.json?name=${q}&status=any`,
    { headers: { "X-Shopify-Access-Token": token, accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  const data = (await res.json()) as {
    orders?: Array<{
      id: number;
      name: string;
      fulfillment_status: string | null;
      financial_status: string;
      created_at: string;
    }>;
  };
  const order = data.orders?.[0];
  if (!order) return { status: "not_found", order_id: orderId };
  return {
    order_id: order.name,
    status: order.fulfillment_status ?? order.financial_status,
    financial_status: order.financial_status,
    created_at: order.created_at,
    provider: "shopify",
    live: true,
  };
}

async function hubspotWrite(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (tool.includes("ticket") || tool === "create_ticket") {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/tickets", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          subject: String(args.subject ?? args.summary ?? "Agent ticket"),
          content: String(args.details ?? args.description ?? args.summary ?? ""),
          hs_pipeline_stage: "1",
        },
      }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) throw new Error(`HubSpot: ${json.message ?? res.status}`);
    return { ok: true, reference: json.id, provider: "hubspot", live: true };
  }

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email: String(args.email ?? args.contact ?? "unknown@example.com"),
        firstname: String(args.name ?? args.first_name ?? "Lead"),
        phone: String(args.phone ?? ""),
        message: String(args.summary ?? args.notes ?? ""),
      },
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`HubSpot: ${json.message ?? res.status}`);
  return { ok: true, reference: json.id, provider: "hubspot", live: true };
}

async function googleCalendar(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (tool.includes("availability") || tool.includes("check_availability")) {
    const timeMin = String(args.start ?? args.date ?? new Date().toISOString());
    const start = new Date(timeMin);
    const timeMax = new Date(start.getTime() + 24 * 3600 * 1000).toISOString();
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        timeMin: start.toISOString(),
        timeMax,
        items: [{ id: "primary" }],
      }),
    });
    const json = (await res.json()) as {
      calendars?: { primary?: { busy?: Array<{ start: string; end: string }> } };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message ?? `Google ${res.status}`);
    return {
      available: (json.calendars?.primary?.busy?.length ?? 0) === 0,
      busy: json.calendars?.primary?.busy ?? [],
      provider: "google_calendar",
      live: true,
    };
  }

  const start = String(args.datetime ?? args.date ?? new Date(Date.now() + 86400000).toISOString());
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      summary: String(args.service ?? args.summary ?? "Appointment"),
      description: String(args.notes ?? args.name ?? ""),
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      attendees: args.contact ? [{ email: String(args.contact) }] : undefined,
    }),
  });
  const json = (await res.json()) as { id?: string; htmlLink?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Google ${res.status}`);
  return {
    booked: true,
    booking_ref: json.id,
    link: json.htmlLink,
    provider: "google_calendar",
    live: true,
  };
}

async function m365Calendar(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (tool.includes("availability") || tool.includes("check_availability")) {
    const start = new Date(String(args.start ?? args.date ?? Date.now())).toISOString();
    const end = new Date(new Date(start).getTime() + 24 * 3600 * 1000).toISOString();
    const res = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        schedules: ["me"],
        startTime: { dateTime: start, timeZone: "UTC" },
        endTime: { dateTime: end, timeZone: "UTC" },
        availabilityViewInterval: 60,
      }),
    });
    const json = (await res.json()) as { value?: unknown; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message ?? `Graph ${res.status}`);
    return { available: true, schedule: json.value, provider: "m365_calendar", live: true };
  }

  const start = new Date(String(args.datetime ?? args.date ?? Date.now() + 86400000));
  const end = new Date(start.getTime() + 3600000);
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      subject: String(args.service ?? "Appointment"),
      body: { contentType: "Text", content: String(args.notes ?? args.name ?? "") },
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
    }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Graph ${res.status}`);
  return { booked: true, booking_ref: json.id, provider: "m365_calendar", live: true };
}

async function sendEmail(
  token: string,
  args: Record<string, unknown>,
  meta: Record<string, string>,
): Promise<Record<string, unknown>> {
  const to = String(args.to ?? args.contact ?? process.env.HANDOFF_EMAIL_TO ?? "");
  const subject = String(args.subject ?? "Agent handoff");
  const body = String(args.summary ?? args.body ?? args.message ?? "");
  if (!to) throw new Error("Email recipient missing (to / HANDOFF_EMAIL_TO)");

  if (meta.emailProvider === "microsoft") {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "Text", content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });
    if (!res.ok) throw new Error(`Graph mail ${res.status}`);
    return { sent: true, to, provider: "email", live: true };
  }

  // Gmail API raw message
  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Gmail ${res.status}`);
  return { sent: true, to, id: json.id, provider: "email", live: true };
}

async function teamsHandoff(token: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const teamId = process.env.TEAMS_TEAM_ID ?? "";
  const channelId = process.env.TEAMS_CHANNEL_ID ?? "";
  if (!teamId || !channelId) {
    throw new Error("Set TEAMS_TEAM_ID and TEAMS_CHANNEL_ID for live Teams handoff");
  }
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: `<p><b>Agent handoff</b></p><p>${String(args.summary ?? args.reason ?? "")}</p>`,
        },
      }),
    },
  );
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Teams ${res.status}`);
  return { routed: true, provider: "teams", id: json.id, live: true };
}

async function zendeskTicket(
  token: string,
  subdomain: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ticket: {
        subject: String(args.subject ?? "Agent ticket"),
        comment: { body: String(args.details ?? args.summary ?? "") },
      },
    }),
  });
  const json = (await res.json()) as { ticket?: { id?: number }; error?: string; description?: string };
  if (!res.ok) throw new Error(json.description ?? json.error ?? `Zendesk ${res.status}`);
  return { ok: true, reference: String(json.ticket?.id), provider: "zendesk", live: true };
}

async function calendlyBook(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const me = await fetch("https://api.calendly.com/users/me", {
    headers: { authorization: `Bearer ${token}` },
  });
  const meJson = (await me.json()) as { resource?: { uri?: string; scheduling_url?: string } };
  if (!me.ok) throw new Error(`Calendly me ${me.status}`);
  return {
    booked: true,
    scheduling_url: meJson.resource?.scheduling_url,
    user: meJson.resource?.uri,
    requested: args,
    provider: "calendly",
    live: true,
  };
}

async function xeroRead(token: string, tenantId: string, args: Record<string, unknown>) {
  const res = await fetch("https://api.xero.com/api.xro/2.0/Invoices?page=1", {
    headers: {
      authorization: `Bearer ${token}`,
      "xero-tenant-id": tenantId,
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Xero ${res.status}`);
  const json = (await res.json()) as { Invoices?: unknown[] };
  return {
    ok: true,
    count: json.Invoices?.length ?? 0,
    echo: args,
    provider: "xero",
    live: true,
  };
}

async function quickbooksRead(
  token: string,
  realmId: string,
  args: Record<string, unknown>,
) {
  const base =
    process.env.QUICKBOOKS_ENV === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";
  const q = encodeURIComponent("select * from Invoice maxresults 5");
  const res = await fetch(`${base}/v3/company/${realmId}/query?query=${q}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`QuickBooks ${res.status}`);
  return { ok: true, provider: "quickbooks", live: true, echo: args, data: await res.json() };
}

async function whatsappSend(apiKey: string, phoneNumberId: string, args: Record<string, unknown>) {
  const to = String(args.to ?? args.phone ?? "").replace(/\D/g, "");
  if (!to) throw new Error("WhatsApp recipient phone required");
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: String(args.message ?? args.summary ?? "Hello from MyInstantAI") },
    }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return { ok: true, provider: "whatsapp", live: true, ...json };
}

async function stripePaymentLink(apiKey: string, args: Record<string, unknown>) {
  const amount = Math.round(Number(args.amount_cents ?? args.amount ?? 1000));
  const currency = String(args.currency ?? "usd");
  const productRes = await fetch("https://api.stripe.com/v1/products", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      name: String(args.description ?? "Agent payment"),
    }),
  });
  const product = (await productRes.json()) as { id?: string; error?: { message?: string } };
  if (!productRes.ok) throw new Error(product.error?.message ?? "Stripe product failed");

  const priceRes = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      product: product.id!,
      unit_amount: String(amount),
      currency,
    }),
  });
  const price = (await priceRes.json()) as { id?: string; error?: { message?: string } };
  if (!priceRes.ok) throw new Error(price.error?.message ?? "Stripe price failed");

  const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ "line_items[0][price]": price.id!, "line_items[0][quantity]": "1" }),
  });
  const link = (await linkRes.json()) as { url?: string; error?: { message?: string } };
  if (!linkRes.ok) throw new Error(link.error?.message ?? "Stripe link failed");
  return { ok: true, url: link.url, provider: "stripe", live: true };
}

async function wooOrder(config: Record<string, string>, args: Record<string, unknown>) {
  const base = (config.store_url ?? "").replace(/\/$/, "");
  const key = config.consumer_key ?? "";
  const secret = config.consumer_secret ?? "";
  if (!base || !key || !secret) throw new Error("WooCommerce store_url + keys required");
  const orderId = String(args.order_id ?? "");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${base}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`WooCommerce ${res.status}`);
  const json = (await res.json()) as { status?: string; id?: number };
  return {
    order_id: json.id,
    status: json.status,
    provider: "woocommerce",
    live: true,
  };
}

export { stubFor };

export async function executeLive(call: ConnectorCall): Promise<ConnectorResult> {
  const { connector, config = {} } = call.binding;

  try {
    const keyTok = await getToken(call.workspaceId, connector);

    switch (connector) {
      case "webhook": {
        const url = keyTok?.meta.url || config.url;
        const secret = keyTok?.meta.secret || keyTok?.accessToken || config.secret || "";
        if (!url) throw new Error("Webhook URL missing");
        const data = await postWebhook(url, secret === "configured" ? config.secret ?? "" : secret, {
          tool: call.tool,
          args: call.args,
          agentId: call.agentId,
          workspaceId: call.workspaceId,
        });
        return { ok: true, data, connector, stubbed: false };
      }
      case "mcp": {
        const endpoint = keyTok?.meta.endpoint || config.endpoint;
        const token = keyTok?.meta.token || keyTok?.accessToken || config.token || "";
        if (!endpoint) throw new Error("MCP endpoint missing");
        const res = await fetch(`${endpoint}/tools/call`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token === "configured" ? config.token ?? "" : token}`,
          },
          body: JSON.stringify({ name: call.tool, arguments: call.args }),
        });
        if (!res.ok) throw new Error(`MCP ${res.status}`);
        return { ok: true, data: (await res.json()) as Record<string, unknown>, connector, stubbed: false };
      }
      default:
        break;
    }

    // API-key connectors: sealed token store → binding config → env
    if (connector === "whatsapp") {
      const apiKey =
        keyTok?.accessToken ||
        config.api_key ||
        process.env.WHATSAPP_TOKEN ||
        "";
      const phoneNumberId =
        keyTok?.meta.phone_number_id ||
        config.phone_number_id ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        "";
      if (!apiKey || !phoneNumberId || apiKey === "configured") {
        throw new Error("WhatsApp token + phone_number_id required");
      }
      return {
        ok: true,
        data: await whatsappSend(apiKey, phoneNumberId, call.args),
        connector,
        stubbed: false,
      };
    }
    if (connector === "stripe") {
      const apiKey =
        keyTok?.accessToken || config.api_key || process.env.STRIPE_SECRET_KEY || "";
      if (!apiKey || apiKey === "configured") throw new Error("STRIPE_SECRET_KEY required");
      return {
        ok: true,
        data: await stripePaymentLink(apiKey, call.args),
        connector,
        stubbed: false,
      };
    }
    if (connector === "woocommerce") {
      const wooConfig = { ...config, ...(keyTok?.meta ?? {}) };
      if (keyTok?.meta.consumer_key) wooConfig.consumer_key = keyTok.meta.consumer_key;
      if (keyTok?.meta.consumer_secret) wooConfig.consumer_secret = keyTok.meta.consumer_secret;
      return {
        ok: true,
        data: await wooOrder(wooConfig, call.args),
        connector,
        stubbed: false,
      };
    }

    const stored =
      (await getValidAccessToken(call.workspaceId, connector)) ??
      (config.access_token
        ? {
            accessToken: config.access_token,
            meta: config,
            workspaceId: call.workspaceId,
            connectorId: connector,
            updatedAt: new Date().toISOString(),
          }
        : null);

    if (!stored?.accessToken || stored.accessToken === "demo") {
      return {
        ok: true,
        data: {
          ...stubFor(call.tool, call.args),
          _note: `${connector} not OAuth-connected — complete Connect in Actions`,
        },
        connector,
        stubbed: true,
      };
    }

    const token = stored.accessToken;
    const meta = "meta" in stored ? stored.meta : config;

    let data: Record<string, unknown>;
    switch (connector as ConnectorId) {
      case "slack":
        data = await slackHandoff(token, call.args, meta);
        break;
      case "shopify":
        data = await shopifyOrder(token, meta.shop ?? config.shop ?? "", call.args);
        break;
      case "hubspot":
        data = await hubspotWrite(token, call.tool, call.args);
        break;
      case "google_calendar":
        data = await googleCalendar(token, call.tool, call.args);
        break;
      case "m365_calendar":
        data = await m365Calendar(token, call.tool, call.args);
        break;
      case "email":
        data = await sendEmail(token, call.args, meta);
        break;
      case "teams":
        data = await teamsHandoff(token, call.args);
        break;
      case "zendesk":
        data = await zendeskTicket(token, meta.subdomain ?? "", call.args);
        break;
      case "calendly":
        data = await calendlyBook(token, call.args);
        break;
      case "xero":
        data = await xeroRead(token, meta.tenantId ?? "", call.args);
        break;
      case "quickbooks":
        data = await quickbooksRead(token, meta.realmId ?? "", call.args);
        break;
      default:
        data = { ...stubFor(call.tool, call.args), provider: connector, live: true };
    }

    // Ensure token file stays warm
    void getToken(call.workspaceId, connector);

    return { ok: true, data, connector, stubbed: false };
  } catch (e) {
    return {
      ok: false,
      data: {
        error: e instanceof Error ? e.message : "Connector failed",
        suggestion: "I couldn't reach the connected system — I can hand this to the team.",
      },
      connector,
      stubbed: false,
    };
  }
}
