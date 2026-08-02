import type { ConnectorCall, ConnectorResult, ConnectorId } from "../types.js";
import { getValidAccessToken } from "../oauth/flow.js";
import { getToken } from "../oauth/tokens.js";
import { HttpResponseError, withRetry } from "../retry.js";

function stubFor(tool: string, args: Record<string, unknown>): Record<string, unknown> {
  const n = tool.toLowerCase();
  if (n.includes("place_order") || n === "place_order") {
    return {
      ok: true,
      status: "placed",
      reference: "ORD-3391",
      order_ref: "ORD-3391",
      fulfilment: args.fulfilment ?? "collection",
      items: args.items,
      source: "sandbox_stub",
    };
  }
  if (n.includes("get_menu") || n === "get_menu" || n.includes("list_menu")) {
    return {
      ok: true,
      category: args.category ?? "all",
      items: [
        { name: "Margherita", vegetarian: true },
        { name: "Pepperoni" },
        { name: "flame-grilled beef burger" },
        { name: "skin-on fries" },
      ],
      note: "Sandbox stub — prefer prices from knowledge base menu sections.",
      source: "sandbox_stub",
    };
  }
  if (n.includes("check_table_availability") || n === "check_table_availability") {
    return {
      ok: true,
      available: true,
      party_size: args.party_size ?? 2,
      datetime: args.datetime ?? "Friday 19:00",
      slots: [{ label: "Friday 19:00" }, { label: "Friday 19:30" }],
      source: "sandbox_stub",
    };
  }
  if (n.includes("book_table") || n === "book_table") {
    return {
      ok: true,
      booked: true,
      reference: "TBL-4821",
      booking_ref: "TBL-4821",
      status: "confirmed",
      ...args,
      source: "sandbox_stub",
    };
  }
  if (n.includes("order")) return { status: "out_for_delivery", eta: "tomorrow", order_id: args.order_id ?? "4821" };
  if (
    n.includes("availability") ||
    n.includes("check_availability") ||
    n.includes("check_calendar") ||
    n === "check_calendar"
  )
    return {
      ok: true,
      available: true,
      date: String(args.date ?? args.datetime ?? "tomorrow").slice(0, 10),
      events: [
        { start: "09:00", end: "09:30", title: "Weekly team standup" },
        { start: "12:30", end: "13:00", title: "Lunch block" },
      ],
      free_blocks: ["10:00–12:00", "14:00–16:00"],
      slots: [
        { datetime: "2026-08-07T10:00:00", label: "Thursday 10:00" },
        { datetime: "2026-08-07T14:30:00", label: "Thursday 14:30" },
      ],
      requested: args,
      source: "sandbox_stub",
    };
  if (n.includes("schedule_meeting") || n === "schedule_meeting")
    return {
      scheduled: true,
      booked: true,
      status: "scheduled",
      reference: "EVT-4821",
      booking_ref: "EVT-4821",
      event_id: "EVT-4821",
      datetime: args.datetime,
      title: args.title,
      attendees: args.attendees,
      source: "sandbox_stub",
    };
  if (n.includes("set_reminder") || n === "set_reminder")
    return {
      set: true,
      reference: "REM-2201",
      when: args.when,
      text: args.text,
      source: "sandbox_stub",
    };
  if (n.includes("notify_team") || n === "notify_team")
    return {
      ok: true,
      routed: true,
      channel: "slack",
      reference: "SLACK-NOTIFY-1",
      summary: args.summary,
      source: "sandbox_stub",
    };
  if (n.includes("reschedule_or_cancel") || n === "reschedule_or_cancel") {
    const action = String(args.action ?? (/cancel/i.test(String(args.notes ?? "")) ? "cancel" : "reschedule"));
    return {
      ok: true,
      status: action === "cancel" ? "cancelled" : "rescheduled",
      booking_ref: args.booking_ref ?? args.reference ?? "BK-7Q3F",
      reference: args.booking_ref ?? args.reference ?? "BK-7Q3F",
      new_datetime: args.new_datetime,
      source: "sandbox_stub",
    };
  }
  if (n.includes("book")) return { booked: true, booking_ref: "BK-3391", reference: "BK-3391", ...args };
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
  if (n.includes("search_kb") || n === "search_kb") {
    const q = String(args.query ?? args.topic ?? "").toLowerCase();
    if (/vpn|globalprotect/.test(q)) {
      return {
        ok: true,
        topic: "vpn",
        article:
          "VPN client: GlobalProtect — install from portal.ubuntu-systems.co.za. Gateway: vpn.ubuntu-systems.co.za. Sign in with SSO + Microsoft Authenticator.",
        source: "sandbox_stub",
      };
    }
    if (/password|lock|reset/.test(q)) {
      return {
        ok: true,
        topic: "password",
        article:
          "Never share passwords in chat. Self-service reset: reset.ubuntu-systems.co.za with Microsoft Authenticator.",
        source: "sandbox_stub",
      };
    }
    return {
      ok: true,
      topic: args.topic ?? "general",
      article: "See the IT knowledge base article for this topic. Escalate security incidents immediately.",
      source: "sandbox_stub",
    };
  }
  if (n.includes("get_ticket_status") || n === "get_ticket_status") {
    return {
      ok: true,
      ticket_id: args.ticket_id ?? args.reference ?? "TKT-4821",
      status: "in_progress",
      assignee: "IT L2",
      note: "Sandbox stub status.",
      source: "sandbox_stub",
    };
  }
  if (n.includes("create_ticket") || n === "create_ticket") {
    return {
      ok: true,
      reference: "TKT-9102",
      status: "logged",
      subject: args.subject,
      source: "sandbox_stub",
    };
  }
  if (n.includes("send_info") || n === "send_info") {
    return {
      ok: true,
      topic: args.topic ?? args.plan ?? "plans",
      blurb:
        "Approved plan info on file — Growth is the mid-tier for growing teams with cash-flow dashboards and standard integrations. Share published ranges from knowledge; not an exact quote.",
      source: "sandbox_stub",
    };
  }
  if (n.includes("capture_lead") || n === "capture_lead") {
    return {
      ok: true,
      reference: "LEAD-4821",
      status: "captured",
      name: args.name,
      email: args.email,
      company: args.company,
      source: "sandbox_stub",
    };
  }
  if (n.includes("ticket") || n.includes("lead") || n.includes("capture") || n.includes("application"))
    return { ok: true, reference: "APP-4821", status: "captured", ...args };
  if (n.includes("handoff")) return { routed: true, queue: "human_desk" };
  if (n.includes("guest")) return { ok: true, request_ref: "GR-1001", status: "logged", ...args };
  if (n.includes("amenity") || n.includes("get_amenity"))
    return {
      ok: true,
      topic: args.topic ?? "general",
      info:
        "Check-in from 15:00 · Check-out by 11:00. Breakfast 07:00–10:30. Wi‑Fi network on your key sleeve. Pool & gym 06:30–22:00.",
      hours: "See knowledge for amenity hours",
      source: "sandbox_stub",
    };
  if (n.includes("local_recommend") || n.includes("get_local"))
    return {
      ok: true,
      kind: args.kind ?? "restaurants",
      items: [
        { name: "Café Einstein", note: "Casual", distance: "10 min walk" },
        { name: "Museum Island", note: "Attractions", distance: "15 min" },
      ],
      source: "sandbox_stub",
    };
  if (n.includes("treatment_info") || n.includes("get_treatment"))
    return {
      ok: true,
      treatment: args.treatment ?? args.topic ?? "exam",
      info:
        "General overview only — exam & cleaning is typically one visit; fillings under local anesthetic. Whether you need a treatment is a clinical decision.",
      source: "sandbox_stub",
    };
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
  if (n.includes("payslip"))
    return {
      ok: true,
      found: true,
      period: "2026-07",
      employee: args.employee_id ?? "EMP-2048",
      gross: "24 000",
      net: "18 060",
      paye: "3 900",
      deductions: { paye: "3 900", uif: "240", provident_fund: "1 800" },
      pay_date: "25th",
      source: "sandbox_stub",
    };
  if (n.includes("leave_balance") || (n.includes("leave") && n.includes("balance")))
    return {
      ok: true,
      annual: "14.5",
      sick: "12",
      family: "3",
      source: "sandbox_stub",
    };
  if (n.includes("levy"))
    return {
      ok: true,
      due_day: "1st",
      schedule: [
        { unit_type: "1-bedroom", amount: "1450" },
        { unit_type: "2-bedroom", amount: "1980" },
        { unit_type: "3-bedroom", amount: "2650" },
      ],
      special_levy: "USD 500/month per unit until December 2026 (roof refurbishment)",
      source: "sandbox_stub",
    };
  if (n.includes("access_rules") || n.endsWith("_access") || n === "get_access")
    return {
      ok: true,
      visitor_bays: 6,
      max_stay_hours: 24,
      topics: ["visitor", "parking", "gate", "pets", "noise"],
      source: "sandbox_stub",
    };
  if (n.includes("po_status") || n.includes("purchase_order"))
    return {
      ok: true,
      po_number: args.po_number ?? args.order_id ?? "PO-10432",
      supplier: "Bosveld Office Supplies",
      amount: "18 450",
      status: "approved, awaiting delivery",
      expected_delivery: "2 Aug",
      source: "sandbox_stub",
    };
  if (n.includes("treatment_info") || n.includes("get_treatment"))
    return {
      ok: true,
      note: "Prefer treatment details and prices from the knowledge base.",
      source: "sandbox_stub",
    };
  if (n.includes("prep_instruction"))
    return {
      ok: true,
      instructions: "Follow fasting rules; bring ID and medical aid card.",
      source: "sandbox_stub",
    };
  if (n.includes("amenity"))
    return {
      ok: true,
      note: "Answer amenity/check-in/breakfast/parking from knowledge.",
      source: "sandbox_stub",
    };
  if (n.includes("list_courses") || n.includes("match_course"))
    return {
      ok: true,
      courses: ["IT Systems", "Software Development", "Business Admin"],
      source: "sandbox_stub",
    };
  if (n.includes("requirement"))
    return {
      ok: true,
      note: "Relay requirements from knowledge / openings.",
      source: "sandbox_stub",
    };
  if (n.includes("deadline"))
    return {
      ok: true,
      note: "Relay deadlines from knowledge.",
      source: "sandbox_stub",
    };
  if (n.includes("track") || n.includes("consignment") || n.includes("waybill"))
    return {
      ok: true,
      status: "in_transit",
      eta: "tomorrow",
      waybill: args.waybill ?? args.tracking_number ?? "WB-1001",
      source: "sandbox_stub",
    };
  if (n.includes("statement"))
    return {
      ok: true,
      balance: "45210",
      currency: "local",
      source: "sandbox_stub",
    };
  if (n.includes("outage"))
    return {
      ok: true,
      status: "known_outage",
      eta_restore: "within 4 hours",
      source: "sandbox_stub",
    };
  if (n.includes("stock") || n.includes("inventory"))
    return {
      ok: true,
      in_stock: true,
      qty: 12,
      source: "sandbox_stub",
    };
  if (n.includes("product_info") || n.includes("get_product"))
    return {
      ok: true,
      note: "Relay product details from knowledge.",
      source: "sandbox_stub",
    };
  if (n.includes("log_") || n.includes("maintenance") || n.includes("exception"))
    return { ok: true, reference: "REF-1001", status: "logged", ...args };
  if (n.includes("get_plans") || n.includes("list_plans") || n === "get_plans")
    return {
      ok: true,
      plans: [
        { name: "Basic", price: "399" },
        { name: "Premium", price: "699" },
        { name: "12-month", price: "499" },
      ],
      source: "sandbox_stub",
    };
  if (n.includes("class_schedule"))
    return {
      ok: true,
      classes: ["Spin 06:30", "HIIT 18:00", "Yoga 19:00"],
      source: "sandbox_stub",
    };
  if (n.includes("freeze") || n.includes("cancel"))
    return { ok: true, reference: "REF-1001", status: "logged", ...args };
  if (n.includes("get_onboarding_checklist") || n === "get_onboarding_checklist") {
    return {
      ok: true,
      role: args.role ?? "new joiner",
      day: args.day ?? "1",
      items: [
        "Collect access card from reception",
        "Set up laptop and enable MFA",
        "Meet onboarding buddy and manager",
        "Day 1 orientation / training",
        "Schedule 1:1 with manager",
      ],
      source: "sandbox_stub",
    };
  }
  if (n.includes("get_resource") || n === "get_resource") {
    return {
      ok: true,
      topic: args.topic ?? "general",
      title: args.topic === "payroll" ? "Self-Service portal — payroll" : "Onboarding resource",
      url: "https://portal.example.com/self-service",
      note: "Prefer knowledge base for exact portal wording.",
      source: "sandbox_stub",
    };
  }
  if (n.includes("log_question") || n === "log_question") {
    return {
      ok: true,
      reference: "REF-0001",
      status: "logged",
      topic: args.topic,
      question: args.question,
      source: "sandbox_stub",
    };
  }
  if (n.includes("onboarding") || n.includes("supplier"))
    return { ok: true, reference: "ONB-1001", status: "started", case: "onboarding", ...args };
  if (n.includes("procurement_policy"))
    return {
      ok: true,
      note: "Answer quote thresholds and approval rules from knowledge.",
      source: "sandbox_stub",
    };
  if (n.includes("catalogue") || n.includes("list_catalogue"))
    return {
      ok: true,
      items: ["Airtime", "Data", "Gaming", "Gift cards"],
      brands: ["MTN", "Vodacom", "Steam", "Google Play"],
      source: "sandbox_stub",
    };
  if (n.includes("purchase_voucher") || n.includes("purchase"))
    return { ok: true, reference: "VAS-1001", status: "purchased", delivery: "sms_email", ...args };
  if (n.includes("check_price") || n.includes("get_price"))
    return { ok: true, price: "25", currency: "local", item: args.item ?? args.query, source: "sandbox_stub" };
  if (n.includes("record_sale"))
    return { ok: true, reference: "SALE-1001", status: "recorded", ...args };
  if (n.includes("credit_book") || n.includes("credit"))
    return { ok: true, reference: "CR-1001", status: "logged", customer: "Sipho", amount: "50", ...args };
  if (n.includes("reorder") || n.includes("place_reorder"))
    return { ok: true, reference: "RO-1001", status: "logged", ...args };
  if (n.includes("take_message"))
    return { ok: true, reference: "MSG-1001", status: "taken", ...args };
  if (n.includes("route_to_department") || n.includes("route"))
    return { ok: true, department: args.department ?? "general", routed: true };
  if (n.includes("tier") || n.includes("points_balance") || n.includes("loyalty"))
    return {
      ok: true,
      points: 1200,
      tier: "Silver",
      expiry_months: 24,
      source: "sandbox_stub",
    };
  if (n.includes("deadline"))
    return { ok: true, note: "Relay deadlines from knowledge.", source: "sandbox_stub" };
  if (n.includes("document"))
    return { ok: true, note: "Relay required documents from knowledge.", source: "sandbox_stub" };
  if (n.includes("callback") || n === "book_callback")
    return {
      ok: true,
      booked: true,
      reference: "CB-1001",
      booking_ref: "CB-1001",
      status: "booked",
      datetime: args.datetime ?? "Thursday afternoon",
      phone: args.phone,
      source: "sandbox_stub",
      ...args,
    };
  return { ok: true, reference: "REF-0001", echo: args };
}

async function postWebhook(url: string, secret: string, payload: unknown): Promise<Record<string, unknown>> {
  const { safeFetch } = await import("../ssrf.js");
  const { signWebhookPayload } = await import("../webhook-sig.js");
  return withRetry(async () => {
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const signature = secret ? signWebhookPayload(secret, timestamp, body) : "";
    const res = await safeFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature
          ? {
              "x-miai-signature": signature,
              "x-miai-timestamp": timestamp,
            }
          : {}),
      },
      body,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      throw new Error("Webhook redirects are not followed (SSRF protection)");
    }
    if (!res.ok) throw new HttpResponseError(res.status, `Webhook ${res.status}`);
    try {
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return { ok: true, status: res.status };
    }
  });
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

async function hubspotDefaultTicketStage(token: string): Promise<string | undefined> {
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/pipelines/tickets", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      results?: Array<{ stages?: Array<{ id: string; label?: string }> }>;
    };
    const stage = json.results?.[0]?.stages?.[0]?.id;
    return stage ? String(stage) : undefined;
  } catch {
    return undefined;
  }
}

async function hubspotWrite(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (tool.includes("ticket") || tool === "create_ticket") {
    const stage =
      (typeof args.hs_pipeline_stage === "string" && args.hs_pipeline_stage) ||
      (await hubspotDefaultTicketStage(token));
    const properties: Record<string, string> = {
      subject: String(args.subject ?? args.summary ?? "Agent ticket"),
      content: String(args.details ?? args.description ?? args.summary ?? ""),
    };
    // Prefer portal's first ticket stage — hardcoding "1" breaks many HubSpot accounts.
    if (stage) properties.hs_pipeline_stage = stage;

    const res = await fetch("https://api.hubapi.com/crm/v3/objects/tickets", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) throw new Error(`HubSpot: ${json.message ?? res.status}`);
    return { ok: true, reference: json.id, provider: "hubspot", live: true };
  }

  const contact = String(args.email ?? args.contact ?? "");
  const email =
    contact.includes("@")
      ? contact
      : `lead+${Date.now().toString(36)}@example.com`;
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email,
        firstname: String(args.name ?? args.first_name ?? "Lead"),
        phone: String(args.phone ?? (contact.includes("@") ? "" : contact)),
        message: String(args.summary ?? args.notes ?? ""),
      },
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`HubSpot: ${json.message ?? res.status}`);
  return { ok: true, reference: json.id, provider: "hubspot", live: true, email };
}

async function googleCalendar(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const n = tool.toLowerCase();

  // Read: freeBusy + optional events list for EA check_calendar
  if (
    n.includes("availability") ||
    n.includes("check_availability") ||
    n.includes("check_calendar") ||
    n === "check_calendar"
  ) {
    const timeMin = String(args.start ?? args.datetime ?? args.date ?? new Date().toISOString());
    const start = new Date(timeMin);
    if (Number.isNaN(start.getTime())) {
      start.setTime(Date.now());
    }
    // Normalize date-only to start of day
    if (/^\d{4}-\d{2}-\d{2}$/.test(timeMin)) {
      start.setHours(0, 0, 0, 0);
    }
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
    const busy = json.calendars?.primary?.busy ?? [];
    return {
      ok: true,
      date: start.toISOString().slice(0, 10),
      available: busy.length === 0,
      busy,
      events: busy.map((b) => ({ start: b.start, end: b.end, title: "Busy" })),
      free_blocks: busy.length === 0 ? ["Full day appears free on primary calendar"] : [],
      provider: "google_calendar",
      live: true,
    };
  }

  // Reminder: create a timed event with reminder popup (Google has no standalone reminder API in Calendar v3 for all accounts)
  if (n.includes("set_reminder") || n.includes("reminder")) {
    const when = new Date(String(args.when ?? args.datetime ?? Date.now() + 3600000));
    const end = new Date(when.getTime() + 15 * 60 * 1000);
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: `Reminder: ${String(args.text ?? args.summary ?? "Nudge")}`,
        description: String(args.text ?? ""),
        start: { dateTime: when.toISOString() },
        end: { dateTime: end.toISOString() },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
      }),
    });
    const json = (await res.json()) as { id?: string; htmlLink?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message ?? `Google ${res.status}`);
    return {
      set: true,
      reference: json.id,
      when: when.toISOString(),
      link: json.htmlLink,
      provider: "google_calendar",
      live: true,
    };
  }

  // Write: schedule_meeting / book_*
  const start = String(args.datetime ?? args.date ?? new Date(Date.now() + 86400000).toISOString());
  const startDate = new Date(start);
  const durationMin = Number(args.duration_minutes ?? 30);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
  const attendeesRaw = args.attendees;
  const attendees = Array.isArray(attendeesRaw)
    ? attendeesRaw.map((a) => {
        const s = String(a);
        return s.includes("@") ? { email: s } : { displayName: s, email: `${s.toLowerCase().replace(/\s+/g, ".")}@example.com` };
      })
    : args.contact
      ? [{ email: String(args.contact) }]
      : undefined;

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      summary: String(args.title ?? args.service ?? args.summary ?? "Meeting"),
      description: String(args.notes ?? args.name ?? ""),
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      attendees,
    }),
  });
  const json = (await res.json()) as {
    id?: string;
    htmlLink?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? `Google ${res.status}`);
  return {
    scheduled: true,
    booked: true,
    status: "scheduled",
    booking_ref: json.id,
    reference: json.id,
    event_id: json.id,
    link: json.htmlLink,
    datetime: startDate.toISOString(),
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
  const { safeFetch } = await import("../ssrf.js");
  const res = await safeFetch(`${base}/wp-json/wc/v3/orders/${orderId}`, {
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
        return {
          ok: true,
          data: { ...data, live: true, provider: "webhook" },
          connector,
          stubbed: false,
        };
      }
      case "mcp": {
        const endpoint = String(keyTok?.meta.endpoint || config.endpoint || "").replace(/\/$/, "");
        const token = keyTok?.meta.token || keyTok?.accessToken || config.token || "";
        if (!endpoint) throw new Error("MCP endpoint missing");
        const bearer = token === "configured" ? config.token ?? "" : token;
        const { safeFetch } = await import("../ssrf.js");
        const data = await withRetry(async () => {
          const res = await safeFetch(`${endpoint}/tools/call`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
            },
            body: JSON.stringify({ name: call.tool, arguments: call.args }),
          });
          if (!res.ok) throw new HttpResponseError(res.status, `MCP ${res.status}`);
          try {
            return (await res.json()) as Record<string, unknown>;
          } catch {
            return { ok: true, status: res.status };
          }
        });
        return {
          ok: true,
          data: { ...data, live: true, provider: "mcp" },
          connector,
          stubbed: false,
        };
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

    return {
      ok: true,
      data: { ...data, live: true, provider: connector },
      connector,
      stubbed: false,
    };
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
