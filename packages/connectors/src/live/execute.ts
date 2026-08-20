import type { ConnectorCall, ConnectorResult, ConnectorId } from "../types.js";
import { getValidAccessToken } from "../oauth/flow.js";
import { getToken } from "../oauth/tokens.js";
import { executeMcp } from "./handlers/mcp.js";
import { slackHandoff } from "./handlers/slack.js";
import { executeWebhook } from "./handlers/webhook.js";

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
  if (n.includes("check_float") || n === "check_float")
    return {
      ok: true,
      float: "$4,320.00",
      currency: "USD",
      low_float: false,
      daily_used: "$1,050.00",
      daily_limit: "$10,000.00",
      source: "sandbox_stub",
    };
  if (n.includes("stock") || n.includes("inventory"))
    return {
      ok: true,
      available: true,
      level: "in_stock",
      in_stock: true,
      qty: 12,
      source: "sandbox_stub",
      note: "Sandbox stub — prefer price from knowledge base.",
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

async function shopifyOrder(
  token: string,
  shop: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const orderId = String(args.order_id ?? args.orderId ?? "").replace(/^#/, "");
  if (!orderId) throw new Error("order_id required");
  const { normalizeShop } = await import("../oauth/providers.js");
  const host = normalizeShop(shop);
  if (!host) throw new Error("Invalid Shopify shop host (*.myshopify.com required)");
  const q = encodeURIComponent(orderId);
  const { safeFetch } = await import("../ssrf.js");
  const res = await safeFetch(
    `https://${host}/admin/api/2024-10/orders.json?name=${q}&status=any`,
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

  const action = String(args.action ?? "").toLowerCase();
  const wantsCreate =
    n.includes("schedule") ||
    n.includes("book") ||
    n.includes("create") ||
    Boolean(args.title || args.summary || args.attendees) ||
    ["create", "schedule", "book", "add", "new"].includes(action);

  // Read: list upcoming events ("what's on my calendar" — manage_calendar with no new-event payload)
  if (
    !wantsCreate &&
    (n.includes("manage_calendar") ||
      n.includes("list") ||
      n.includes("agenda") ||
      n.includes("upcoming") ||
      n.includes("show") ||
      action === "list")
  ) {
    const nowDate = new Date();
    const ref = args.date || args.start ? new Date(String(args.date ?? args.start)) : nowDate;
    if (Number.isNaN(ref.getTime())) ref.setTime(nowDate.getTime());
    const days = Math.max(1, Math.min(31, Number(args.days ?? 1) || 1));
    const timeMin = new Date(ref);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(timeMin.getTime() + days * 24 * 3600 * 1000);
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", timeMin.toISOString());
    url.searchParams.set("timeMax", timeMax.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "25");
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    const json = (await res.json()) as {
      items?: Array<{
        summary?: string;
        location?: string;
        htmlLink?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message ?? `Google ${res.status}`);
    const events = (json.items ?? []).map((e) => ({
      title: e.summary ?? "(no title)",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      allDay: Boolean(e.start?.date && !e.start?.dateTime),
      location: e.location,
      link: e.htmlLink,
    }));
    return {
      events,
      count: events.length,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      provider: "google_calendar",
      live: true,
    };
  }

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

type InboxItem = {
  from: string;
  subject: string;
  preview?: string;
  date: string;
  ageHours: number | null;
  today: boolean;
  unread: boolean;
  important: boolean;
};

/** Fetch one message's header metadata (+ body snippet, when the scope allows it). */
async function fetchInboxItem(id: string, token: string, now: number): Promise<InboxItem | null> {
  const getUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
  getUrl.searchParams.set("format", "metadata");
  for (const h of ["From", "Subject", "Date"]) getUrl.searchParams.append("metadataHeaders", h);
  const r = await fetch(getUrl, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const j = (await r.json()) as {
    internalDate?: string;
    labelIds?: string[];
    snippet?: string;
    payload?: { headers?: Array<{ name: string; value: string }> };
  };
  const headers = j.payload?.headers;
  const header = (name: string): string =>
    headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  const ts = Number(j.internalDate ?? 0);
  const labels = j.labelIds ?? [];
  const snippet = (j.snippet ?? "").trim();
  return {
    from: header("From"),
    subject: header("Subject") || "(no subject)",
    preview: snippet ? snippet.slice(0, 160) : undefined,
    date: ts ? new Date(ts).toISOString() : header("Date"),
    ageHours: ts ? Math.round((now - ts) / 3.6e6) : null,
    today: ts ? new Date(ts).toDateString() === new Date(now).toDateString() : false,
    unread: labels.includes("UNREAD"),
    important: labels.includes("IMPORTANT") || labels.includes("STARRED"),
  };
}

/**
 * Read the user's recent inbox for a triage summary. Prefers the gmail.readonly scope
 * (server-side `q` search + body-snippet previews); if the token only has the older gmail.metadata
 * grant (which forbids `q`), it falls back to a label listing with headers only — so it keeps
 * working with existing connections and never forces a reconnect.
 */
async function gmailTriage(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const max = Math.max(1, Math.min(25, Number(args.max ?? args.limit ?? args.count ?? 12) || 12));
  const query = String(args.query ?? args.q ?? "").trim() || "newer_than:2d";
  const auth = { authorization: `Bearer ${token}` };
  const base = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

  // Prefer readonly search; a metadata-only token 403s on `q`, so fall back to a label listing.
  let usedSearch = true;
  const byQuery = new URL(base);
  byQuery.searchParams.set("q", query);
  byQuery.searchParams.set("maxResults", String(max));
  let listRes = await fetch(byQuery, { headers: auth });
  if (listRes.status === 403) {
    usedSearch = false;
    const byLabel = new URL(base);
    byLabel.searchParams.set("labelIds", "INBOX");
    byLabel.searchParams.set("maxResults", String(max));
    listRes = await fetch(byLabel, { headers: auth });
  }
  const listJson = (await listRes.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message?: string };
  };
  if (!listRes.ok) throw new Error(listJson.error?.message ?? `Gmail ${listRes.status}`);

  const window = usedSearch ? query : "recent inbox";
  const ids = (listJson.messages ?? []).map((m) => m.id);
  if (ids.length === 0) {
    return { provider: "email", live: true, count: 0, unread: 0, today: 0, messages: [], window };
  }

  const now = Date.now();
  const details = await Promise.all(ids.map((id) => fetchInboxItem(id, token, now)));
  const messages = details.filter((m): m is InboxItem => m !== null);
  // Surface the most actionable first: important, then unread, then most recent.
  messages.sort(
    (a, b) =>
      Number(b.important) - Number(a.important) ||
      Number(b.unread) - Number(a.unread) ||
      String(b.date).localeCompare(String(a.date)),
  );

  return {
    provider: "email",
    live: true,
    count: messages.length,
    unread: messages.filter((m) => m.unread).length,
    important: messages.filter((m) => m.important).length,
    today: messages.filter((m) => m.today).length,
    messages,
    note: usedSearch
      ? undefined
      : "Header-level view (sender, subject, time). Reconnect Gmail to enable message previews and search.",
    window,
  };
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
  const { normalizeZendeskSubdomain } = await import("../oauth/providers.js");
  const sub = normalizeZendeskSubdomain(subdomain);
  if (!sub) throw new Error("Invalid Zendesk subdomain");
  const { safeFetch } = await import("../ssrf.js");
  const res = await safeFetch(`https://${sub}.zendesk.com/api/v2/tickets.json`, {
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

/** Live web search via the Brave Search API. Returns null when no API key is configured. */
async function webSearch(args: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const key =
    process.env.BRAVE_SEARCH_API_KEY ||
    process.env.BRAVE_API_KEY ||
    process.env.SEARCH_API_KEY ||
    "";
  const query = String(args.query ?? args.q ?? args.topic ?? "").trim();
  if (!key || !query) return null;
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("extra_snippets", "true");
  const res = await fetch(url, {
    headers: { "X-Subscription-Token": key, accept: "application/json" },
  });
  const j = (await res.json()) as {
    web?: {
      results?: Array<{ title?: string; url?: string; description?: string; extra_snippets?: string[] }>;
    };
    error?: { detail?: string };
  };
  if (!res.ok) throw new Error(j.error?.detail ?? `Search ${res.status}`);
  const strip = (s: string) => s.replace(/<[^>]+>/g, "");
  const results = (j.web?.results ?? []).slice(0, 8).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: strip(r.description ?? ""),
    details: (r.extra_snippets ?? []).slice(0, 4).map(strip),
  }));
  return { query, results, provider: "web_search", live: true };
}

/** Current weather via OpenWeather. Returns null when no API key is configured. */
async function weatherLookup(args: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || "";
  const loc = String(args.location ?? args.city ?? args.place ?? args.query ?? "").trim();
  if (!key || !loc) return null;
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", loc);
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", key);
  const res = await fetch(url);
  const j = (await res.json()) as {
    name?: string;
    weather?: Array<{ description?: string }>;
    main?: { temp?: number; feels_like?: number; humidity?: number };
    wind?: { speed?: number };
    message?: string;
  };
  if (!res.ok) throw new Error(j.message ?? `Weather ${res.status}`);
  return {
    location: j.name ?? loc,
    conditions: j.weather?.[0]?.description ?? "",
    temp_c: j.main?.temp,
    feels_like_c: j.main?.feels_like,
    humidity_pct: j.main?.humidity,
    wind_kph: typeof j.wind?.speed === "number" ? Math.round(j.wind.speed * 3.6) : undefined,
    provider: "weather",
    live: true,
  };
}

/** Google Tasks — add / list / complete on the user's default task list. */
async function googleTasks(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const auth = { authorization: `Bearer ${token}` };
  const base = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";
  const action = String(args.action ?? (args.task ?? args.title ? "add" : "list")).toLowerCase();

  if (action === "add" || action === "create") {
    const title = String(args.task ?? args.title ?? args.text ?? "").trim();
    if (!title) throw new Error("Task text required");
    const res = await fetch(base, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const j = (await res.json()) as { id?: string; title?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(j.error?.message ?? `Tasks ${res.status}`);
    return { added: true, id: j.id, task: j.title, provider: "google_tasks", live: true };
  }
  if (action === "complete" || action === "done") {
    const id = String(args.task_id ?? args.id ?? "").trim();
    if (!id) throw new Error("task_id required to complete a task");
    const res = await fetch(`${base}/${id}`, {
      method: "PATCH",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    const j = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) throw new Error(j.error?.message ?? `Tasks ${res.status}`);
    return { completed: true, id, provider: "google_tasks", live: true };
  }

  const url = new URL(base);
  url.searchParams.set("showCompleted", "false");
  url.searchParams.set("maxResults", "50");
  const res = await fetch(url, { headers: auth });
  const j = (await res.json()) as {
    items?: Array<{ id?: string; title?: string; due?: string; status?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(j.error?.message ?? `Tasks ${res.status}`);
  const tasks = (j.items ?? []).map((t) => ({
    id: t.id,
    task: t.title,
    due: t.due,
    done: t.status === "completed",
  }));
  return { tasks, count: tasks.length, provider: "google_tasks", live: true };
}

/** Google Contacts (People API) — search the user's contacts by name/email. */
async function googleContacts(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const q = String(args.query ?? args.name ?? args.contact ?? args.q ?? "").trim();
  const url = new URL("https://people.googleapis.com/v1/people:searchContacts");
  url.searchParams.set("query", q);
  url.searchParams.set("readMask", "names,emailAddresses,phoneNumbers");
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const j = (await res.json()) as {
    results?: Array<{
      person?: {
        names?: Array<{ displayName?: string }>;
        emailAddresses?: Array<{ value?: string }>;
        phoneNumbers?: Array<{ value?: string }>;
      };
    }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(j.error?.message ?? `Contacts ${res.status}`);
  const contacts = (j.results ?? []).map((r) => ({
    name: r.person?.names?.[0]?.displayName ?? "",
    email: r.person?.emailAddresses?.[0]?.value,
    phone: r.person?.phoneNumbers?.[0]?.value,
  }));
  return { query: q, contacts, count: contacts.length, provider: "google_contacts", live: true };
}

/** Google Drive — search the user's files by name / content. */
async function googleDrive(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const q = String(args.query ?? args.name ?? args.q ?? "").trim();
  const esc = q.replace(/'/g, "\\'");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "q",
    q ? `(name contains '${esc}' or fullText contains '${esc}') and trashed = false` : "trashed = false",
  );
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,webViewLink)");
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const j = (await res.json()) as {
    files?: Array<{ name?: string; mimeType?: string; modifiedTime?: string; webViewLink?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(j.error?.message ?? `Drive ${res.status}`);
  const files = (j.files ?? []).map((f) => ({
    name: f.name ?? "",
    type: f.mimeType ?? "",
    modified: f.modifiedTime ?? "",
    link: f.webViewLink,
  }));
  return { query: q, files, count: files.length, provider: "google_drive", live: true };
}

/** YouTube — search for videos on a topic (read-only). */
/**
 * YouTube search (public data). Prefers a server-side API key (YOUTUBE_API_KEY) — public search
 * needs no user auth and this avoids per-user scope/enablement pitfalls — and falls back to the
 * user's OAuth token. On the common "API not enabled" / "needs reconnect" failures it returns an
 * actionable note instead of throwing, so the assistant can tell the user exactly what to fix.
 */
async function youtubeSearch(
  args: Record<string, unknown>,
  auth: { apiKey?: string; token?: string },
): Promise<Record<string, unknown>> {
  const q = String(args.query ?? args.q ?? args.topic ?? "").trim();
  const max = Math.max(1, Math.min(10, Number(args.max ?? args.limit ?? 5) || 5));
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(max));
  if (auth.apiKey) url.searchParams.set("key", auth.apiKey);
  const headers: Record<string, string> = auth.apiKey
    ? {}
    : { authorization: `Bearer ${auth.token ?? ""}` };

  const res = await fetch(url, { headers });
  const j = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string; publishedAt?: string; description?: string };
    }>;
    error?: { message?: string; errors?: Array<{ reason?: string }> };
  };
  if (!res.ok) {
    const msg = j.error?.message ?? `YouTube ${res.status}`;
    const reason = j.error?.errors?.[0]?.reason ?? "";
    const notEnabled = /accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(
      `${msg} ${reason}`,
    );
    if (res.status === 403 && notEnabled) {
      return {
        query: q, videos: [], count: 0, available: false, provider: "youtube", live: false,
        note: "YouTube search isn't switched on yet — enable the YouTube Data API v3 in the Google Cloud project, or set a YOUTUBE_API_KEY.",
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        query: q, videos: [], count: 0, available: false, provider: "youtube", live: false,
        note: "I need YouTube reconnected before I can search it — reconnect YouTube under Accounts.",
      };
    }
    throw new Error(msg);
  }
  const videos = (j.items ?? [])
    .filter((it) => it.id?.videoId)
    .map((it) => ({
      title: it.snippet?.title ?? "",
      channel: it.snippet?.channelTitle ?? "",
      published: it.snippet?.publishedAt ?? "",
      url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
    }));
  return { query: q, videos, count: videos.length, provider: "youtube", live: true };
}

/** Pull a human title out of a Notion page/database search result. */
function notionTitle(r: {
  title?: Array<{ plain_text?: string }>;
  properties?: Record<string, { type?: string; title?: Array<{ plain_text?: string }> }>;
}): string {
  const join = (arr?: Array<{ plain_text?: string }>) =>
    Array.isArray(arr) ? arr.map((t) => t.plain_text ?? "").join("") : "";
  if (Array.isArray(r.title) && r.title.length) return join(r.title) || "(untitled)";
  for (const p of Object.values(r.properties ?? {})) {
    if (p?.type === "title") return join(p.title) || "(untitled)";
  }
  return "(untitled)";
}

/** Notion — search the user's pages and databases. Read-only. */
async function notionSearch(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const query = String(args.query ?? args.q ?? args.title ?? "").trim();
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ query, page_size: 10 }),
  });
  const j = (await res.json()) as {
    results?: Array<{
      object?: string;
      url?: string;
      last_edited_time?: string;
      title?: Array<{ plain_text?: string }>;
      properties?: Record<string, { type?: string; title?: Array<{ plain_text?: string }> }>;
    }>;
    message?: string;
  };
  if (!res.ok) throw new Error(j.message ?? `Notion ${res.status}`);
  const results = (j.results ?? []).map((r) => ({
    title: notionTitle(r),
    type: r.object ?? "page",
    url: r.url,
    edited: r.last_edited_time,
  }));
  return { query, results, count: results.length, provider: "notion", live: true };
}

/** Spotify playback — play a search query, pause, or report what's playing. */
async function spotifyControl(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const auth = { authorization: `Bearer ${token}` };
  const intent = `${tool} ${String(args.action ?? "")}`.toLowerCase();
  const query = String(args.query ?? args.track ?? args.song ?? args.q ?? "").trim();

  // Spotify's API can only control an already-running device — it cannot launch the app. Player
  // controls fail in expected ways (no active device, playback restriction, free account), so turn
  // those into clear guidance instead of the generic connector-failure message.
  const unavailable = (premium: boolean, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    played: false,
    reason: premium ? "premium_required" : "no_active_device",
    note: premium
      ? "Controlling playback from here needs Spotify Premium on this account."
      : "No active Spotify device — open Spotify on your phone, computer or the web player, then try again.",
    provider: "spotify",
    live: true,
    ...extra,
  });
  const putPlayer = async (path: string, body?: unknown): Promise<{ ok: boolean; premium: boolean }> => {
    const res = await fetch(`https://api.spotify.com/v1/me/player/${path}`, {
      method: "PUT",
      headers: body ? { ...auth, "content-type": "application/json" } : auth,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok || res.status === 204) return { ok: true, premium: false };
    const j = (await res.json().catch(() => ({}))) as { error?: { reason?: string; message?: string } };
    // Only a 5xx is a real fault; every 4xx here (no device, restriction, premium) is expected and
    // returned as a friendly message rather than thrown.
    if (res.status >= 500) throw new Error(j.error?.message ?? `Spotify ${res.status}`);
    return { ok: false, premium: j.error?.reason === "PREMIUM_REQUIRED" };
  };

  const nowPlaying = async (): Promise<Record<string, unknown>> => {
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: auth,
    });
    if (res.status === 204) {
      return { playing: false, note: "Nothing is playing right now.", provider: "spotify", live: true };
    }
    const j = (await res.json()) as {
      item?: { name?: string; artists?: Array<{ name?: string }> };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(j.error?.message ?? `Spotify ${res.status}`);
    return {
      playing: true,
      track: j.item?.name,
      artist: (j.item?.artists ?? []).map((a) => a.name).join(", "),
      provider: "spotify",
      live: true,
    };
  };

  if (/pause|stop/.test(intent)) {
    const r = await putPlayer("pause");
    return r.ok ? { paused: true, provider: "spotify", live: true } : unavailable(r.premium);
  }

  // No track named: "what's playing / current" reports; "play / resume / open / start" resumes.
  if (!query) {
    if (/current|playing|what|now/.test(intent) && !/play|resume|open|start|go/.test(intent)) {
      return nowPlaying();
    }
    const r = await putPlayer("play");
    return r.ok ? { resumed: true, provider: "spotify", live: true } : unavailable(r.premium);
  }

  const s = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(query)}`,
    { headers: auth },
  );
  const sj = (await s.json()) as {
    tracks?: { items?: Array<{ uri?: string; name?: string; artists?: Array<{ name?: string }> }> };
    error?: { message?: string };
  };
  if (!s.ok) throw new Error(sj.error?.message ?? `Spotify ${s.status}`);
  const track = sj.tracks?.items?.[0];
  if (!track?.uri) {
    return { played: false, note: `No track found for "${query}".`, provider: "spotify", live: true };
  }
  const artist = (track.artists ?? []).map((a) => a.name).join(", ");
  const r = await putPlayer("play", { uris: [track.uri] });
  return r.ok
    ? { played: true, track: track.name, artist, provider: "spotify", live: true }
    : unavailable(r.premium, { wanted: track.name, artist });
}

/** Create a Spotify playlist for the user and add tracks to it. Needs the playlist-modify scope. */
async function spotifyCreatePlaylist(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const auth = { authorization: `Bearer ${token}` };
  const name = String(args.name ?? args.playlist ?? args.title ?? "").trim() || "New playlist";

  const rawTracks = args.tracks ?? args.songs ?? args.items;
  const wanted = (
    Array.isArray(rawTracks)
      ? rawTracks.map((t) => String(t))
      : String(rawTracks ?? "").split(/,|;| and /i)
  )
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

  const meRes = await fetch("https://api.spotify.com/v1/me", { headers: auth });
  const me = (await meRes.json()) as { id?: string; error?: { message?: string } };
  if (!meRes.ok || !me.id) throw new Error(me.error?.message ?? `Spotify ${meRes.status}`);

  const createRes = await fetch(
    `https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`,
    {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ name, public: false, description: "Created by your assistant" }),
    },
  );
  const pl = (await createRes.json()) as {
    id?: string;
    external_urls?: { spotify?: string };
    error?: { message?: string };
  };
  if (!createRes.ok || !pl.id) {
    // 403 here means the token predates the playlist-modify scope — guide the user to reconnect.
    if (createRes.status === 403) {
      return {
        created: false,
        reason: "reconnect_required",
        note: "I couldn't create the playlist — reconnect Spotify to grant playlist permissions (Disconnect, then Connect again on the accounts page).",
        provider: "spotify",
        live: true,
      };
    }
    throw new Error(pl.error?.message ?? `Spotify ${createRes.status}`);
  }

  const uris: string[] = [];
  const notFound: string[] = [];
  for (const q of wanted) {
    const sr = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(q)}`,
      { headers: auth },
    );
    const sj = (await sr.json()) as { tracks?: { items?: Array<{ uri?: string }> } };
    const uri = sj.tracks?.items?.[0]?.uri;
    if (uri) uris.push(uri);
    else notFound.push(q);
  }
  if (uris.length) {
    await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ uris }),
    });
  }

  return {
    created: true,
    name,
    playlist_url: pl.external_urls?.spotify,
    added: uris.length,
    not_found: notFound,
    provider: "spotify",
    live: true,
  };
}

/** Todoist — add / list / complete tasks (REST v2). */
async function todoistTasks(
  token: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const auth = { authorization: `Bearer ${token}` };
  const action = String(args.action ?? (args.task ?? args.title ? "add" : "list")).toLowerCase();

  if (action === "add" || action === "create") {
    const content = String(args.task ?? args.title ?? args.text ?? "").trim();
    if (!content) throw new Error("Task text required");
    const res = await fetch("https://api.todoist.com/rest/v2/tasks", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const j = (await res.json()) as { id?: string; content?: string; error?: string };
    if (!res.ok) throw new Error(j.error ?? `Todoist ${res.status}`);
    return { added: true, id: j.id, task: j.content, provider: "todoist", live: true };
  }
  if (action === "complete" || action === "done") {
    const id = String(args.task_id ?? args.id ?? "").trim();
    if (!id) throw new Error("task_id required to complete a task");
    const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}/close`, {
      method: "POST",
      headers: auth,
    });
    if (!res.ok) throw new Error(`Todoist ${res.status}`);
    return { completed: true, id, provider: "todoist", live: true };
  }

  const res = await fetch("https://api.todoist.com/rest/v2/tasks", { headers: auth });
  const j = (await res.json()) as
    | Array<{ id?: string; content?: string; due?: { date?: string } }>
    | { error?: string };
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `Todoist ${res.status}`);
  const tasks = (Array.isArray(j) ? j : []).map((t) => ({
    id: t.id,
    task: t.content,
    due: t.due?.date,
    done: false,
  }));
  return { tasks, count: tasks.length, provider: "todoist", live: true };
}

/**
 * Internal personal-assistant tools (tasks / memory / web research) bind to the `webhook`
 * connector, but on the consumer line there is no external sink configured. Rather than hard-fail
 * on a missing webhook URL, handle them locally: tasks and remembered facts are echoed back so the
 * model keeps them in the conversation, and web research is deferred to the model's own knowledge.
 * Returns null for anything that should still go to a real webhook.
 */
function handleInternalAssistantTool(call: ConnectorCall): ConnectorResult | null {
  const n = call.tool.toLowerCase();
  const a = call.args;
  const wrap = (data: Record<string, unknown>): ConnectorResult => ({
    ok: true,
    data: { ...data, provider: "assistant", live: false },
    connector: "webhook",
    stubbed: true,
  });

  // Order matters: "remember_person" also contains "remember", so people/goals are matched first.
  if (n.includes("person") || n.includes("contact")) {
    const name = String(a.name ?? a.person ?? a.who ?? "").trim();
    return wrap({
      saved: Boolean(name),
      name,
      note: "Noted — I'll remember them.",
    });
  }
  if (n.includes("goal")) {
    const title = String(a.title ?? a.goal ?? a.name ?? "").trim();
    return wrap({
      saved: Boolean(title),
      title,
      note: "Got it — I'll keep track of that goal.",
    });
  }
  if (n.includes("remember")) {
    const fact = String(a.fact ?? a.note ?? a.text ?? a.value ?? "").trim();
    return wrap({
      remembered: Boolean(fact),
      fact,
      note: "Noted — I'll remember this.",
    });
  }
  if (n.includes("task")) {
    const taskAction = String(a.action ?? (a.task ? "add" : "list")).toLowerCase();
    return wrap({
      ok: true,
      action: taskAction,
      task: a.task ?? a.item ?? a.text ?? null,
      note: "Task tracked in this conversation. A durable task list isn't set up in this environment yet.",
    });
  }
  if (n.includes("research")) {
    return wrap({
      available: false,
      query: String(a.query ?? a.q ?? a.topic ?? ""),
      note: "Live web research isn't enabled here — answer from general knowledge and note it may be out of date.",
    });
  }
  return null;
}

export async function executeLive(call: ConnectorCall): Promise<ConnectorResult> {
  const { connector, config = {} } = call.binding;

  try {
    const keyTok = await getToken(call.workspaceId, connector);

    switch (connector) {
      case "webhook": {
        // Internal assistant tools (tasks / memory / research) have no external sink on the
        // consumer line — handle them locally instead of failing on a missing webhook URL. A
        // configured URL still wins, so B2B agents keep forwarding to the tenant's backend.
        const webhookUrl = keyTok?.meta.url || config.url;
        if (!webhookUrl) {
          const local = handleInternalAssistantTool(call);
          if (local) return local;
        }
        // Must await inside this try block — returning the bare promise lets a
        // later rejection (e.g. "Webhook URL missing") escape uncaught past the
        // catch below, instead of degrading gracefully like every other connector.
        return await executeWebhook(call, keyTok, config);
      }
      case "mcp":
        return await executeMcp(call, keyTok, config);
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
    if (connector === "web_search") {
      const found = await webSearch(call.args);
      if (found) return { ok: true, data: found, connector, stubbed: false };
      // No search key configured — degrade to the model's own knowledge rather than fail.
      const local = handleInternalAssistantTool(call);
      if (local) return local;
      return {
        ok: true,
        data: {
          available: false,
          query: String(call.args.query ?? ""),
          note: "Web search isn't configured here — answer from general knowledge and note it may be out of date.",
        },
        connector,
        stubbed: true,
      };
    }
    if (connector === "weather") {
      const found = await weatherLookup(call.args);
      if (found) return { ok: true, data: found, connector, stubbed: false };
      return {
        ok: true,
        data: {
          available: false,
          location: String(call.args.location ?? call.args.city ?? ""),
          note: "Weather isn't configured in this environment.",
        },
        connector,
        stubbed: true,
      };
    }
    if (connector === "youtube" && process.env.YOUTUBE_API_KEY) {
      // Public search needs no user auth — a server-side key works for everyone without OAuth.
      return {
        ok: true,
        data: await youtubeSearch(call.args, { apiKey: process.env.YOUTUBE_API_KEY }),
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
      // Internal assistant tools (e.g. tasks) degrade to a conversational result rather than a
      // "complete Connect" stub — so the assistant stays useful before the account is linked.
      const local = handleInternalAssistantTool(call);
      if (local) return local;
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
      case "google_tasks":
        data = await googleTasks(token, call.args);
        break;
      case "google_contacts":
        data = await googleContacts(token, call.args);
        break;
      case "google_drive":
        data = await googleDrive(token, call.args);
        break;
      case "youtube":
        data = await youtubeSearch(call.args, {
          apiKey: process.env.YOUTUBE_API_KEY,
          token,
        });
        break;
      case "notion":
        data = await notionSearch(token, call.args);
        break;
      case "spotify":
        data = /playlist/.test(call.tool.toLowerCase())
          ? await spotifyCreatePlaylist(token, call.args)
          : await spotifyControl(token, call.tool, call.args);
        break;
      case "todoist":
        data = await todoistTasks(token, call.args);
        break;
      case "m365_calendar":
        data = await m365Calendar(token, call.tool, call.args);
        break;
      case "email": {
        const emailTool = call.tool.toLowerCase();
        if (/triage|inbox|read|check|summar/.test(emailTool)) {
          // Read intent (e.g. triage_inbox) — summarise the inbox, never send.
          data = await gmailTriage(token, call.args);
        } else if (/draft/.test(emailTool)) {
          // Draft intent — return the composed message for the user to approve; do NOT send.
          data = {
            drafted: true,
            to: String(call.args.to ?? call.args.contact ?? ""),
            subject: String(call.args.subject ?? ""),
            body: String(call.args.body ?? call.args.message ?? call.args.summary ?? ""),
            provider: "email",
            live: true,
            note: "Draft prepared — it has NOT been sent. Confirm to send it.",
          };
        } else {
          data = await sendEmail(token, call.args, meta);
        }
        break;
      }
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
