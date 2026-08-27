import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { connectorActionFailureMessage, consumerConnectorLabel } from "../dist/index.js";

// A connector ACTION that fails because the connector isn't connected should, ON THE CONSUMER LINE,
// guide the person to connect their OWN account (they can fix it in one step) — not frame it as a
// transient outage to "retry shortly", and not tell them to "flag a teammate" (there is none). The
// business / embedded surface (a third-party end-user can't connect the merchant's account) keeps the
// neutral wording, and a genuine transient failure keeps it on both surfaces.

const NEUTRAL =
  "I couldn't reach the connected system just now. I can hand this to a teammate, or we can retry shortly.";

describe("connector action decline — consumer connect nudge", () => {
  it("nudges a consumer to connect their own account, naming it, when not connected", () => {
    const msg = connectorActionFailureMessage({
      consumerLine: true,
      notConnected: true,
      connector: "email",
    });
    assert.match(msg, /isn't connected yet/);
    assert.match(msg, /email \(Gmail\)/, "names the specific account");
    assert.match(msg, /Accounts → Manage/, "gives the concrete connect step");
    assert.notEqual(msg, NEUTRAL);
    assert.doesNotMatch(msg, /retry shortly/, "must not frame a setup gap as a transient outage");
  });

  it("leaves the business / embedded decline unchanged (no 'connect it' nudge to a stranger)", () => {
    const msg = connectorActionFailureMessage({
      consumerLine: false,
      notConnected: true,
      connector: "email",
    });
    assert.equal(msg, NEUTRAL);
  });

  it("keeps the neutral retry message for a genuine transient failure, even on the consumer line", () => {
    const msg = connectorActionFailureMessage({
      consumerLine: true,
      notConnected: false,
      connector: "email",
    });
    assert.equal(msg, NEUTRAL, "connector IS connected but the call errored — retry, don't say 'connect it'");
  });

  it("maps common consumer connectors to friendly labels, humanizing the rest", () => {
    assert.equal(consumerConnectorLabel("email"), "email (Gmail)");
    assert.equal(consumerConnectorLabel("google_calendar"), "Google Calendar");
    assert.equal(consumerConnectorLabel("google_tasks"), "Google Tasks");
    assert.equal(consumerConnectorLabel("notion"), "Notion");
    assert.equal(consumerConnectorLabel("some_new_thing"), "some new thing");
    assert.equal(consumerConnectorLabel(undefined), "account");
  });
});
