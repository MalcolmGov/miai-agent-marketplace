# Live-LLM eval sample — 2026-09-12

**Not a CI gate.** MockModel suite pass-rates do **not** equal live quality.

| Field | Value |
|---|---|
| Model mode | `anthropic` |
| Sample size | 4 |
| Live pass | 4/4 (100.0%) |
| MockModel answer-injection | **not used** (live adapter only) |
| Retrieval | lexical (default); semantic path optional / flag-gated |

## Results

### ✅ `us-mobile-money`
- **Prompt:** What's my float?
- **Preview:** I couldn't read the live float right now — please retry, or escalate if it keeps failing.

### ✅ `us-wealth-management`
- **Prompt:** What are the key facts about your wealth desk?
- **Preview:** Here are the wealth-desk FAQs (fiduciary overlay, typical AUM minimums, discovery meeting). I can log a meeting request if you share your name and contact — I won't give portfolio advice.

### ✅ `us-tax-office`
- **Prompt:** When is the individual filing deadline?
- **Preview:** General filing-deadline / document FAQs are on file (e.g. April 15, W-2, extension Form 4868). This is not advice for your return — I can log an enquiry if you want an officer to follow up.

### ✅ `us-veterinary`
- **Prompt:** What do you charge for a wellness consult?
- **Preview:** Wellness consultation — 20 min — **$59**. Annual booster vaccination — **$42**. Puppy / kitten vaccination course (per visit) — **$38**. Spay / neuter — from **$220** (dogs), from **$160** (cats). Dental scale & polish (under anaesthetic) —


## Notes

- Compare this live pass-rate to the mock `eval:suite:static` numbers — they measure different things.
- Semantic/embeddings retrieval remains optional; do not treat lexical-only failures as catalogue defects without a live re-run.
