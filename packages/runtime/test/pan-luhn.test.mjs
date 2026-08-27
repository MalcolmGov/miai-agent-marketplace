import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkInputGuardrails, checkOutputGuardrails } from "../dist/index.js";

// P2-6: the card-number guardrail is Luhn-gated — a real PAN (incl. dot-separated) still triggers
// the refusal, but a long non-card number (order / tracking / reference) no longer false-fires.

const isCardRefusal = (r) => Boolean(r) && /card (number|details|numbers)/i.test(r.content);

describe("PAN detection — input guardrail (P2-6)", () => {
  it("flags a Luhn-valid card number", () => {
    assert.ok(isCardRefusal(checkInputGuardrails("here it is 4111 1111 1111 1111", "", [])));
  });

  it("flags a dot-separated Luhn-valid PAN (previously missed)", () => {
    assert.ok(isCardRefusal(checkInputGuardrails("pay with 4111.1111.1111.1111", "", [])));
  });

  it("does NOT flag a 16-digit non-Luhn order/tracking number", () => {
    // 1111 1111 1111 1111 is a 16-digit run that fails Luhn — an order ref, not a card.
    const r = checkInputGuardrails("my parcel tracking number is 1111 1111 1111 1111", "", []);
    assert.equal(r, null);
  });

  it("still flags explicit card keywords regardless of digits", () => {
    assert.ok(isCardRefusal(checkInputGuardrails("can I give you my card number?", "", [])));
  });
});

describe("PAN detection — output scrub (P2-6)", () => {
  it("scrubs a Luhn-valid PAN the model tried to repeat", () => {
    assert.ok(isCardRefusal(checkOutputGuardrails("q", "your card is 4111 1111 1111 1111", [])));
  });

  it("leaves a non-Luhn reference number in the reply", () => {
    assert.equal(checkOutputGuardrails("q", "your order ref is 1111 1111 1111 1111", []), null);
  });
});
