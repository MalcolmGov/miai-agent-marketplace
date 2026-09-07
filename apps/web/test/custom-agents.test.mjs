import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("custom agents studio & package synthesis", () => {
  it("persists a custom agent and synthesizes an AgentPackage via getAgentPackage", async () => {
    const { upsertWorkspaceAgent, findCustomAgentById, embedKeyFor } = await import(
      "../src/lib/store.ts"
    );
    const { getAgentPackage } = await import("../src/lib/catalog.ts");
    const { toolsForConnectors } = await import("../src/lib/connectors-catalog.ts");

    // Test connector tool resolution
    const toolsFromConnectors = toolsForConnectors(["hubspot", "google_calendar", "stripe"]);
    assert.ok(toolsFromConnectors.includes("log_crm_lead"));
    assert.ok(toolsFromConnectors.includes("schedule_meeting"));
    assert.ok(toolsFromConnectors.includes("create_invoice"));

    const workspaceId = "ws-test-custom";
    const agentId = "custom-test-agent-" + Math.random().toString(36).slice(2, 7);
    const publicKey = embedKeyFor(workspaceId, agentId);

    const saved = await upsertWorkspaceAgent(workspaceId, agentId, {
      agentId,
      name: "Acme Inbound SDR",
      role: "Lead Qualifier",
      category: "sales",
      tier: "standard",
      summary: "Qualifies sales leads for Acme.",
      accentColor: "#6366f1",
      isCustom: true,
      toolsList: ["log_crm_lead", "schedule_meeting"],
      systemPrompt: "You are the Acme Inbound SDR. Qualify prospects and log leads.",
      state: "live",
      model: "claude-haiku-4-5",
      knowledge: "You are the Acme Inbound SDR. Qualify prospects and log leads.",
      publicKey,
      bindings: [
        { tool: "log_crm_lead", mode: "auto" },
        { tool: "schedule_meeting", mode: "auto" },
      ],
      connectedConnectors: ["hubspot", "google_calendar"],
      tone: "consultative",
      market: "za",
      escalationContact: "escalations@acme.com",
      webhookUrl: "https://acme.com/api/agent-events",
      messages: [],
      rentedAt: new Date().toISOString(),
    });

    assert.equal(saved.agentId, agentId);
    assert.equal(saved.name, "Acme Inbound SDR");
    assert.equal(saved.isCustom, true);
    assert.equal(saved.accentColor, "#6366f1");
    assert.deepEqual(saved.connectedConnectors, ["hubspot", "google_calendar"]);
    assert.equal(saved.escalationContact, "escalations@acme.com");

    // findCustomAgentById should locate it
    const found = await findCustomAgentById(agentId);
    assert.ok(found, "Custom agent must be found by id");
    assert.equal(found?.name, "Acme Inbound SDR");
    assert.deepEqual(found?.toolsList, ["log_crm_lead", "schedule_meeting"]);
    assert.equal(found?.tone, "consultative");
    assert.equal(found?.webhookUrl, "https://acme.com/api/agent-events");

    // getAgentPackage should synthesize a valid AgentPackage with escalation prompt
    const pkg = await getAgentPackage(agentId);
    assert.ok(pkg, "getAgentPackage must synthesize package for custom agent");
    assert.equal(pkg?.manifest.id, agentId);
    assert.equal(pkg?.manifest.name, "Acme Inbound SDR");
    assert.equal(pkg?.manifest.category, "sales");
    assert.equal(pkg?.manifest.market, "za");
    assert.equal(pkg?.manifest.model.primary, "claude-haiku-4-5");
    assert.ok(pkg?.system_prompt.includes("You are the Acme Inbound SDR"));
    assert.ok(pkg?.system_prompt.includes("escalate to: escalations@acme.com"));
    assert.equal(pkg?.tools.length, 2);
    assert.equal(pkg?.tools[0]?.name, "log_crm_lead");
    assert.equal(pkg?.tools[1]?.name, "schedule_meeting");
  });

  it("persists connector credentials and marks connector active on custom agents", async () => {
    const { upsertWorkspaceAgent, getWorkspaceAgent } = await import(
      "../src/lib/store.ts"
    );
    const { saveToken, listConnected } = await import("@miai/connectors");

    const workspaceId = "ws-test-connectors-" + Math.random().toString(36).slice(2, 6);
    const agentId = "custom-agent-auth-" + Math.random().toString(36).slice(2, 6);

    await upsertWorkspaceAgent(workspaceId, agentId, {
      agentId,
      name: "Connector Test Agent",
      isCustom: true,
      state: "live",
      connectedConnectors: ["google_calendar", "hubspot"],
      messages: [],
    });

    // Save demo/simulated token for google_calendar
    await saveToken({
      connectorId: "google_calendar",
      workspaceId,
      accessToken: "demo-sandbox-token",
      meta: { simulated: "true" },
      updatedAt: new Date().toISOString(),
    });

    const connectedList = await listConnected(workspaceId);
    assert.ok(connectedList.includes("google_calendar"), "google_calendar should be in connected list");

    const agent = await getWorkspaceAgent(workspaceId, agentId);
    assert.ok(agent?.connectedConnectors.includes("google_calendar"));
    assert.ok(agent?.connectedConnectors.includes("hubspot"));
  });
});
