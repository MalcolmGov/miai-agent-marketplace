import http from "node:http";

const BASE_URL = process.env.BASE_URL || "http://localhost:3005";

async function fetchRoute(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const resp = await fetch(url, options);
  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: resp.status, text, json };
}

async function runZaraE2E() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  ZARA FLAGSHIP & VOICE STUDIO END-TO-END VERIFICATION SUITE");
  console.log(`  Target: ${BASE_URL}`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra ? `(${extra})` : ""}`);
      failed++;
    }
  }

  // 1. Health probe
  try {
    const health = await fetchRoute("/api/health");
    assert("Health Endpoint (/api/health) returns 200 OK", health.status === 200);
  } catch (err) {
    assert("Health Endpoint reachable", false, err.message);
  }

  // 2. /agents Marketplace Page
  try {
    const agentsPage = await fetchRoute("/agents");
    assert("/agents renders HTTP 200", agentsPage.status === 200);
    assert("Contains Flagship Agents section", agentsPage.text.includes("Flagship Enterprise Agents"));
    assert("Contains Voice Studio flagship card", agentsPage.text.includes("Voice Studio · Instant Agent Forge"));
    assert("Contains Killer Feature badge", agentsPage.text.includes("KILLER FEATURE"));
    assert("Contains 10-seat Boardroom / C-Suite specialists", agentsPage.text.includes("Autonomous C-Suite"));
  } catch (err) {
    assert("/agents page check", false, err.message);
  }

  // 3. /api/voice/speak API Endpoint
  try {
    const voicePost = await fetchRoute("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Zara end-to-end voice synthesis test" }),
    });
    assert("POST /api/voice/speak returns HTTP 200", voicePost.status === 200);
    assert("POST /api/voice/speak returns ok: true", voicePost.json?.ok === true);
    assert("POST /api/voice/speak dual-tier engine active", !!voicePost.json?.provider);

    // Validation check: missing text
    const invalidPost = await fetchRoute("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert("POST /api/voice/speak with empty body returns 400 Bad Request", invalidPost.status === 400);
  } catch (err) {
    assert("Voice speak API test", false, err.message);
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runZaraE2E().catch((err) => {
  console.error("Fatal E2E test runner error:", err);
  process.exit(1);
});
