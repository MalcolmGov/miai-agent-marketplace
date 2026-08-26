import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldLocalizeReply, looksNonEnglish, isEnglishLang } from "../dist/index.js";

// Grounded workflows answer deterministically from the (English) knowledge base and never call
// the model, so a non-English user could receive raw English KB verbatim (e.g. hotel amenity
// queries in French). finishWorkflow re-voices those answers in the user's language, gated by
// shouldLocalizeReply. English turns must keep the zero-cost path; the gate must not be tripped by
// a stray accented proper noun in the (English) answer — which is why the answer is NOT inspected.

describe("localize grounded reply — gating", () => {
  it("localizes when the user writes a non-English message (no replyLanguage)", () => {
    assert.equal(shouldLocalizeReply(undefined, "À quelle heure est le petit-déjeuner ?"), true);
    assert.equal(shouldLocalizeReply(undefined, "¿A qué hora es el desayuno?"), true);
  });

  it("does NOT localize a plain English message (zero-cost path preserved)", () => {
    assert.equal(shouldLocalizeReply(undefined, "What time is breakfast?"), false);
    assert.equal(shouldLocalizeReply(undefined, "Can you recommend a restaurant nearby?"), false);
  });

  it("honours an explicit non-English replyLanguage even if the message looks English", () => {
    assert.equal(shouldLocalizeReply("French", "breakfast time?"), true);
    assert.equal(shouldLocalizeReply("fr", "breakfast time?"), true);
  });

  it("does NOT localize when replyLanguage is (any form of) English", () => {
    for (const en of ["en", "eng", "English", "english", "anglais", "inglés"]) {
      assert.equal(shouldLocalizeReply(en, "¿algo?"), false, `replyLanguage=${en} should be English`);
    }
  });

  it("regression: a bare accented proper noun in the ANSWER must not gate localization", () => {
    // The English KB answer contains "Riverbend Café" — inspecting the answer would false-trip the
    // accent detector and wrongly skip the re-voice. The gate keys off the user's message only.
    assert.equal(looksNonEnglish("Riverbend Café"), true); // proper noun looks non-English…
    assert.equal(shouldLocalizeReply(undefined, "À quelle heure ?"), true); // …but the gate ignores the answer
  });
});

describe("looksNonEnglish / isEnglishLang", () => {
  it("flags accented Latin text and inverted punctuation", () => {
    assert.equal(looksNonEnglish("¿Cómo estás?"), true);
    assert.equal(looksNonEnglish("À quelle heure ?"), true);
    assert.equal(looksNonEnglish("Où est la piscine ?"), true);
  });

  it("flags common non-English function words without accents", () => {
    assert.equal(looksNonEnglish("comment reserver une table"), true); // fr "comment"
    assert.equal(looksNonEnglish("quando arriva il pacco"), true); // it "quando"
  });

  it("passes plain English through as English", () => {
    assert.equal(looksNonEnglish("Where is my package right now?"), false);
    assert.equal(looksNonEnglish("What memberships do you offer?"), false);
  });

  it("isEnglishLang recognises English tags/names, rejects others and undefined", () => {
    for (const en of ["en", "English", "anglais", "inglés"]) assert.equal(isEnglishLang(en), true);
    for (const other of ["fr", "French", "es", undefined]) assert.equal(isEnglishLang(other), false);
  });
});
