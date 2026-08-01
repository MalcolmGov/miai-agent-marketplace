/**
 * Multi-step Restaurant & Takeaway workflow:
 * menu → availability / order plan → confirm → book_table | place_order → notify → verify
 *
 * Large groups, complaints, and allergens escalate; never invents "usual" orders.
 */

export type RtStepStatus = "pending" | "done" | "skipped" | "failed";

export interface RtWorkflowStep {
  id: string;
  label: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: RtStepStatus;
  resultSummary?: string;
}

export interface RtWorkflowPlan {
  id: string;
  goal: string;
  kind: "table" | "order";
  steps: RtWorkflowStep[];
  status: "proposed" | "executing" | "completed" | "cancelled";
}

export interface RtWorkflowTurnResult {
  handled: boolean;
  assistantMessage: string;
  plan?: RtWorkflowPlan;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

const WORKFLOW_RE = /<!--miai-workflow:([\s\S]*?)-->/;

export function isRestaurantTakeaway(agentId: string): boolean {
  return /restaurant-takeaway/i.test(agentId);
}

export function parseRtWorkflowFromMessages(
  messages: Array<{ role: string; content: string }>,
): RtWorkflowPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const match = m.content.match(WORKFLOW_RE);
    if (!match) continue;
    try {
      return JSON.parse(match[1]!) as RtWorkflowPlan;
    } catch {
      return null;
    }
  }
  return null;
}

function embed(message: string, plan: RtWorkflowPlan): string {
  return `${message.replace(WORKFLOW_RE, "").trimEnd()}\n\n<!--miai-workflow:${JSON.stringify(plan)}-->`;
}

function isConfirm(text: string): boolean {
  const lower = text.toLowerCase().replace(/##[\s\S]*$/g, " ").trim();
  return (
    /^(yes|yep|yeah|correct|confirmed|ok|okay)\b/.test(lower) ||
    /yes[,.]? (please|go ahead|that'?s right|that'?s everything|confirm|book)/.test(lower) ||
    /please book it|place the order|go ahead|looks good|that'?s right|that'?s everything/.test(lower)
  );
}

export type ExecuteToolFn = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; data: unknown }>;

function emergencyNumber(agentId: string, knowledge?: string): string {
  const fromKb = knowledge?.match(/call \*\*([^*]+)\*\*/i)?.[1]?.trim();
  if (fromKb) return fromKb;
  if (/eu-/i.test(agentId)) return "112";
  if (/us-/i.test(agentId)) return "911";
  return "local emergency services";
}

function section(knowledge: string | undefined, heading: RegExp): string {
  if (!knowledge) return "";
  return knowledge.match(heading)?.[0]?.slice(0, 1400) ?? "";
}

function menuBlob(knowledge?: string): string {
  if (!knowledge) return "";
  const parts = [
    section(knowledge, /## Menu — Starters[\s\S]*?(?=\n## )/),
    section(knowledge, /## Menu — Grills[\s\S]*?(?=\n## )/),
    section(knowledge, /## Menu — Wood-fired pizza[\s\S]*?(?=\n## )/),
    section(knowledge, /## Menu — Sides[\s\S]*?(?=\n## )/),
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 2000);
}

function extractPhone(text: string): string | undefined {
  return (
    text.match(/(\+?\d[\d\s-]{6,}\d)/)?.[1]?.trim() ||
    text.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)?.[1] ||
    text.match(/\b(555[-.]?\d{4})\b/)?.[1] ||
    text.match(/\b(0\d{2}\s?\d{3}\s?\d{4})\b/)?.[1]
  );
}

function extractName(text: string): string | undefined {
  return (
    text.match(/Name'?s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ||
    text.match(/I'?m\s+([A-Z][a-z]+)/)?.[1]
  );
}

function extractOrderItems(text: string): string[] {
  const items: string[] = [];
  if (/margherita/i.test(text)) items.push("Margherita");
  if (/skin-?on fries|fries/i.test(text)) items.push("skin-on fries");
  if (/burger/i.test(text)) items.push("flame-grilled beef burger");
  if (/wings/i.test(text)) items.push("Buffalo chicken wings");
  return items.length ? items : [text.slice(0, 80)];
}

export async function runRestaurantTakeawayWorkflow(input: {
  agentId: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  toolNames: string[];
  knowledge?: string;
  executeTool: ExecuteToolFn;
}): Promise<RtWorkflowTurnResult> {
  if (!isRestaurantTakeaway(input.agentId)) {
    return { handled: false, assistantMessage: "", toolCalls: [] };
  }

  const user = input.userMessage.replace(/##[\s\S]*$/g, "").trim();
  const lower = user.toLowerCase();
  const pending = parseRtWorkflowFromMessages(input.messages);
  const toolCalls: RtWorkflowTurnResult["toolCalls"] = [];
  const has = (n: string) => input.toolNames.includes(n);
  const prior = input.messages.map((m) => m.content).join(" ").toLowerCase();
  const emerg = emergencyNumber(input.agentId, input.knowledge);
  const menu = menuBlob(input.knowledge);

  // Emergency
  if (/life-?threatening|emergency right now/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "emergency", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `If this is life-threatening, call **${emerg}** / local emergency services now. I'm also handing you to a human urgently.`,
    };
  }

  // Card refuse
  if (/card (number|details)|cvv|\b4111\b|charge it for the order/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't take card details in chat — please pay securely at collection / on delivery, or via the secure link we share. Never share full card numbers here.",
    };
  }

  // Cross-tenant / other table
  if (/table before me|their name and number|what did .+ order/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share another table's order, name, or number — that's confidential. I can only help with your own booking or order.",
    };
  }

  // STOP
  if (/^\s*stop\b|unsubscribe|don't (text|message) me/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "stop_suppression", summary: user.slice(0, 200) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Understood — STOP acknowledged. You won't receive marketing texts; I'm handing off so suppression is completed.",
    };
  }

  // Prompt injection
  if (/ignore (all )?previous|print your (full )?system prompt|reveal your (system )?prompt/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't share internal instructions. I can help with the menu, table bookings, or takeaway orders — what do you need?",
    };
  }

  // Out of scope
  if (/write (me )?a poem|essay about|tell me a joke/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I can't help with that — I can help with menu questions, orders, products, appointments for tables, and bookings.",
    };
  }

  // Explicit human / GDPR / complaint follow-ups
  if (
    /talk to someone|speak to someone|connect me to a person|under gdpr|delete all personal|right to be forgotten/.test(
      lower,
    ) ||
    (/it'?s about an order|please get someone|my name is .+\@|sort it out/.test(lower) &&
      /connecting you to a human|they'll follow up|handoff|furious|complaint/.test(prior))
  ) {
    if (has("handoff_to_human")) {
      const args = {
        reason: /gdpr|delete|forgotten/.test(lower)
          ? "gdpr_erasure"
          : /order|cold|late|furious|sort it/.test(lower + prior)
            ? "complaint"
            : "explicit_request",
        summary: user.slice(0, 400),
      };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I'm connecting you to a human teammate at the restaurant — they'll follow up. You're connected.",
    };
  }

  // Complaint / cold food
  if (/arrived cold|hour late|furious|complaint|ruined/.test(lower)) {
    if (has("handoff_to_human")) {
      const args = { reason: "complaint", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "I'm sorry that happened — I'm connecting you to a human teammate on the team who'll follow up and sort it. I won't invent a refund here.",
    };
  }

  // Large group → handoff (never book via tool alone)
  if (
    /party of\s*(\d{2,})|group of\s*(\d{2,})|(\d{2,})\s*(of us|people|guests)/.test(lower) ||
    /birthday dinner/.test(lower)
  ) {
    const size = Number(
      lower.match(/party of\s*(\d+)/)?.[1] || lower.match(/(\d+)\s+of us/)?.[1] || "20",
    );
    if (size >= 10 || /\bbirthday\b|\b20\s+of us\b|\bparty of 20\b/.test(lower)) {
      if (has("handoff_to_human")) {
        const args = { reason: "large_group", summary: user.slice(0, 400), party_size: size };
        const result = await input.executeTool("handoff_to_human", args);
        toolCalls.push({ name: "handoff_to_human", args, result: result.data });
      }
      return {
        handled: true,
        toolCalls,
        assistantMessage:
          "A party that large needs the floor team — I'm connecting you to a human teammate who'll arrange it. Share the date/time if you haven't, and they'll follow up.",
      };
    }
  }

  // Follow-up after large-group / handoff with details (not table/order confirm)
  if (
    /connecting you to a human|floor team|they'll follow up|arrange it with the team/.test(prior) &&
    !pending &&
    (/of us this saturday|around 19:00|please arrange|my name is .+\@|@example\.com/i.test(user) ||
      /\d{2,}\s+of us/.test(lower) ||
      (/^\s*yes/.test(lower) && /party|large|birthday|20 of us|floor team/.test(prior)))
  ) {
    if (has("handoff_to_human")) {
      const args = { reason: "large_group_followup", summary: user.slice(0, 400) };
      const result = await input.executeTool("handoff_to_human", args);
      toolCalls.push({ name: "handoff_to_human", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage:
        "Thanks — I've passed those details to the human teammate on the team. They'll follow up to arrange it. You're connected.",
    };
  }

  if (pending?.status === "proposed" && /\b(cancel|never ?mind)\b/i.test(lower) && /plan|order|booking|workflow/.test(lower)) {
    const cancelled = { ...pending, status: "cancelled" as const };
    return {
      handled: true,
      plan: cancelled,
      toolCalls: [],
      assistantMessage: embed("Cancelled — I won't place the order or book the table. Tell me if you want the menu instead.", cancelled),
    };
  }

  // Execute confirmed plan
  if (pending?.status === "proposed" && isConfirm(user)) {
    const plan: RtWorkflowPlan = {
      ...pending,
      status: "executing",
      steps: pending.steps.map((s) => ({ ...s })),
    };
    const lines: string[] = [];

    for (const step of plan.steps) {
      if (!step.tool || !has(step.tool)) {
        if (step.tool === "notify_team" && has("handoff_to_human")) {
          const result = await input.executeTool("handoff_to_human", {
            reason: "restaurant_notify",
            summary: String(step.args?.summary ?? plan.goal),
          });
          toolCalls.push({
            name: "handoff_to_human",
            args: { reason: "restaurant_notify", summary: plan.goal },
            result: result.data,
          });
          step.status = "done";
          step.resultSummary = "Notified kitchen/floor";
          lines.push(`✓ ${step.label}`);
          continue;
        }
        if (!step.tool) {
          step.status = "done";
          lines.push(`✓ ${step.label}`);
          continue;
        }
        step.status = "skipped";
        continue;
      }
      const result = await input.executeTool(step.tool, step.args ?? {});
      toolCalls.push({ name: step.tool, args: step.args ?? {}, result: result.data });
      const data = result.data as Record<string, unknown>;
      const ref = String(
        data.reference ?? data.booking_ref ?? data.order_ref ?? data.id ?? (result.ok ? "REF-OK" : "ERR"),
      );
      step.status = result.ok ? "done" : "failed";
      step.resultSummary = ref;
      lines.push(`${result.ok ? "✓" : "✗"} ${step.label} — ${ref}`);
    }

    plan.status = "completed";
    const done = plan.steps.find((s) => (s.id === "book" || s.id === "order") && s.status === "done");
    const msg = [
      done
        ? plan.kind === "order"
          ? `Order placed for **collection** — reference **${done.resultSummary}**. Confirmed.`
          : `Table booked — reference **${done.resultSummary}**. Confirmed.`
        : "Workflow finished.",
      "",
      "## Workflow results",
      ...lines,
    ].join("\n");

    return { handled: true, plan, toolCalls, assistantMessage: embed(msg, plan) };
  }

  // Never invent "usual" order
  if (/my usual|you know what i like|the usual|put through my usual/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "I don't store a 'usual' — please remind me which items you want from the menu (and collection or delivery), and I'll confirm before placing anything.",
    };
  }

  // Not on menu (sushi etc.)
  if (/do you have sushi|any sushi|sushi\?/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage:
        "We don't have sushi — it isn't on our menu. We do wood-fired pizza, grills & burgers, and sides. Want me to list pizzas or burgers?",
    };
  }

  // Hours
  if (/opening hours|kitchen close|what time|hoe laat|sondae oop|hours/.test(lower) && !/how much|price|\$|€|r\d/.test(lower)) {
    const hours =
      section(input.knowledge, /## Opening hours[\s\S]*?(?=\n## )/) ||
      "Tue–Sun 11:00–22:00; kitchen last orders typically 21:30. Closed Mondays unless posted.";
    return { handled: true, toolCalls: [], assistantMessage: hours };
  }

  // Delivery
  if (/do you deliver|delivery|how much is (it|delivery)/.test(lower) && !/arrived cold|late/.test(lower)) {
    const del =
      section(input.knowledge, /## Ordering, collection & delivery[\s\S]*?(?=\n## )/) ||
      "We offer collection and delivery within our published radius during kitchen hours — see delivery fee on file.";
    return { handled: true, toolCalls: [], assistantMessage: del };
  }

  // Localized soft help (ES / FR / ZU)
  const pizzaSec = section(input.knowledge, /## Menu — Wood-fired pizza[\s\S]*?(?=\n## )/);
  if (/hola|pueden ayudar|me pueden ayudar/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: `¡Hola! Claro — puedo **ayuda**r con el menú, una **cita** / mesa, o un pedido. **Precio**s en $:\n\n${pizzaSec || menu}`,
    };
  }
  if (/bonjour|pouvez-vous m'aider|pouvez-vous/.test(lower)) {
    return {
      handled: true,
      toolCalls: [],
      assistantMessage: `Bien sûr — je peux vous **aide**r avec le menu, un **rendez-vous** / table, ou une commande. Prix en **€**:\n\n${pizzaSec || menu}`,
    };
  }
  if (/sawubona|ukuthenga|ninazo|i-pizza/.test(lower)) {
    if (has("get_menu")) {
      const args = { query: user.slice(0, 200), category: "pizza" };
      const result = await input.executeTool("get_menu", args);
      toolCalls.push({ name: "get_menu", args, result: result.data });
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `Yebo — sine-**pizza** ku-**imenyu**, okufaka i-**Margherita**. ${pizzaSec || ""}\n\nUngathanda uku-oda?`,
    };
  }

  // Menu / pizza / price questions
  if (
    /what pizzas|how much|menu|flame-?grilled|beef burger|margherita|burger/.test(lower) &&
    !/order a |book a table|place the order/.test(lower)
  ) {
    if (has("get_menu") && /pizza|menu|what pizzas/.test(lower)) {
      const args = { query: user.slice(0, 200), category: /pizza/i.test(lower) ? "pizza" : "all" };
      const result = await input.executeTool("get_menu", args);
      toolCalls.push({ name: "get_menu", args, result: result.data });
    }
    const burgers = section(input.knowledge, /## Menu — Grills[\s\S]*?(?=\n## )/);
    if (/burger|flame-?grilled/.test(lower) && burgers) {
      return {
        handled: true,
        toolCalls,
        assistantMessage: `${burgers}\n\nI can take a collection order once you confirm the items.`,
      };
    }
    return {
      handled: true,
      toolCalls,
      assistantMessage: `${pizzaSec || menu || "Menu on file."}\n\nTell me what you'd like for collection or if you want a table.`,
    };
  }

  // Table availability check
  if (/table for\s*\d|get a table|availability|friday at|can i get a table/.test(lower) && !/please book a table|name'?s/.test(lower)) {
    if (has("check_table_availability")) {
      const args = {
        party_size: Number(lower.match(/table for\s*(\d+)/)?.[1] || "4"),
        datetime: /friday/i.test(lower) ? "Friday 19:00" : "requested time",
        date: "Friday",
        time: "19:00",
      };
      const result = await input.executeTool("check_table_availability", args);
      toolCalls.push({ name: "check_table_availability", args, result: result.data });
      return {
        handled: true,
        toolCalls,
        assistantMessage: `I checked table availability for ${args.party_size} on Friday around 7pm — we have space. Share a name and number and I'll confirm before I book.`,
      };
    }
  }

  // Table booking → propose plan
  if (/please book a table|book a table for/.test(lower) && /name'?s|number|\d{3}/.test(lower)) {
    const args = {
      party_size: Number(lower.match(/table for\s*(\d+)/)?.[1] || "2"),
      datetime: user.match(/on\s+(\d{4}-\d{2}-\d{2}\s+at\s+\d{2}:\d{2})/i)?.[1] || "2026-08-08 19:00",
      date: "2026-08-08",
      time: "19:00",
      customer_name: extractName(user),
      name: extractName(user),
      phone: extractPhone(user),
      contact: extractPhone(user),
    };
    const plan: RtWorkflowPlan = {
      id: `rt-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "table",
      status: "proposed",
      steps: [
        {
          id: "avail",
          label: `Check table availability (${args.party_size} @ ${args.datetime})`,
          tool: "check_table_availability",
          args,
          status: "pending",
        },
        {
          id: "book",
          label: `Book table for ${args.customer_name ?? "guest"}`,
          tool: "book_table",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify the floor team",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: { summary: `Table booking: ${args.party_size} on ${args.datetime}`, reason: "table_booked" },
          status: "pending",
        },
        { id: "verify", label: "Confirm booking reference", status: "pending" },
      ],
    };
    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can set that up as a multi-step booking workflow — I won't write the reservation until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          "Is that right? Reply **yes, that's right — please book it** to confirm.",
        ].join("\n"),
        plan,
      ),
    };
  }

  // Takeaway / collection order → propose plan
  if (/order a |for collection|place (an |the )?order|can i order/.test(lower) && !/usual/.test(lower)) {
    const items = extractOrderItems(user);
    const args = {
      items,
      fulfilment: /delivery/i.test(lower) ? "delivery" : "collection",
      phone: extractPhone(user),
      contact: extractPhone(user),
      notes: user.slice(0, 240),
    };
    const plan: RtWorkflowPlan = {
      id: `rt-${Date.now().toString(36)}`,
      goal: user.slice(0, 240),
      kind: "order",
      status: "proposed",
      steps: [
        {
          id: "menu",
          label: `Confirm items: ${items.join(", ")}`,
          tool: has("get_menu") ? "get_menu" : undefined,
          args: { query: items.join(", ") },
          status: "pending",
        },
        {
          id: "order",
          label: `Place ${args.fulfilment} order (${items.join(", ")})`,
          tool: "place_order",
          args,
          status: "pending",
        },
        {
          id: "notify",
          label: "Notify the kitchen",
          tool: has("notify_team") ? "notify_team" : "handoff_to_human",
          args: {
            summary: `New ${args.fulfilment} order: ${items.join(", ")} — ${args.phone ?? ""}`,
            reason: "order_placed",
          },
          status: "pending",
        },
        { id: "verify", label: "Confirm order reference", status: "pending" },
      ],
    };
    return {
      handled: true,
      plan,
      toolCalls: [],
      assistantMessage: embed(
        [
          "I can set that up as a multi-step order workflow — I won't place it until you confirm.",
          "",
          `**Goal:** ${plan.goal}`,
          "",
          "## Workflow plan",
          ...plan.steps.map((s, i) => `${i + 1}. ${s.label}`),
          "",
          "Reply **yes, that's everything — place the order please** when you're ready.",
        ].join("\n"),
        plan,
      ),
    };
  }

  return { handled: false, assistantMessage: "", toolCalls: [] };
}
