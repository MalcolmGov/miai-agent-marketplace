import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkOutputGuardrails } from "../dist/index.js";

// E2E journey #6 follow-up: the LIVE output streaming guard's OTP net was keyword-gated to the
// literal "otp" / "one-time (pin|password|code)". A model-drafted example phrased "your verification
// code for login is 123456" therefore streamed through un-redacted on the wire (confirmed against the
// deployed consumer SSE). The at-rest redactPii net already covered "verification code" / "code", so
// this brings the live guard up to parity. The net stays gated on a 4-8 digit run within 40 chars of
// the keyword, so bare order / confirmation / promo numbers are NOT over-redacted (precision held).

const isOtpRefusal = (r) => Boolean(r) && /never share otp/i.test(r.content);

describe("OTP output scrub — bank synonyms (E2E journey #6)", () => {
  it("scrubs the exact live-confirmed leak: 'verification code ... 123456'", () => {
    const r = checkOutputGuardrails("q", "Your verification code for login is 123456.", []);
    assert.ok(isOtpRefusal(r), "verification-code phrasing must now trip the output guard");
  });

  it("scrubs 'security code'", () => {
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your security code is 483920.", [])));
  });

  it("scrubs 'login code'", () => {
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your login code: 55123", [])));
  });

  it("scrubs 'access code'", () => {
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "The access code is 9021.", [])));
  });

  it("scrubs 'one-time passcode' and bare 'passcode'", () => {
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your one-time passcode is 483920.", [])));
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your passcode is 4821.", [])));
  });

  it("scrubs 'authentication code' / 'auth code' and '2FA code'", () => {
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your authentication code is 771204.", [])));
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your 2FA code is 660011.", [])));
  });

  it("REGRESSION — still scrubs the literal 'OTP ... digits'", () => {
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your OTP is 483920.", [])));
    assert.ok(isOtpRefusal(checkOutputGuardrails("q", "Your one-time code is 483920.", [])));
  });

  it("PRECISION — leaves a bare number with no OTP keyword untouched", () => {
    assert.equal(checkOutputGuardrails("q", "Your order number is 123456.", []), null);
    assert.equal(checkOutputGuardrails("q", "Your confirmation number is 4839201.", []), null);
    assert.equal(checkOutputGuardrails("q", "Call me at extension 4821.", []), null);
  });

  it("PRECISION — does NOT over-broaden to bare 'code' (promo code stays)", () => {
    // We deliberately added specific OTP synonyms, not bare "code", so a promo/coupon code is kept.
    assert.equal(checkOutputGuardrails("q", "Your promo code is 12345 — 20% off.", []), null);
  });
});
