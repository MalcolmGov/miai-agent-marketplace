# Live-LLM eval sample — 2026-09-12

**Not a CI gate.** MockModel suite pass-rates do **not** equal live quality.

| Field | Value |
|---|---|
| Model mode | `anthropic` |
| Sample size | 5 |
| Live pass | 5/5 (100.0%) |
| MockModel answer-injection | **not used** (live adapter only) |
| Retrieval | lexical (default); semantic path optional / flag-gated |

## Results

### ✅ `us-mobile-money`
- **Prompt:** What's my float?
- **Preview:** I couldn't read the live float right now — please retry, or escalate if it keeps failing.

### ✅ `us-tax-office`
- **Prompt:** When is the individual filing deadline?
- **Preview:** General filing-deadline / document FAQs are on file (e.g. April 15, W-2, extension Form 4868). This is not advice for your return — I can log an enquiry if you want an officer to follow up.

### ✅ `us-dental-front-desk`
- **Prompt:** What treatments do you offer?
- **Preview:** ## Treatments & fees (private / cash pay) - Comprehensive exam & cleaning — 45 min — **$150**. - Child cleaning (under 14) — 30 min — **$95**. - Filling (tooth-colored) — from **$175**. - Simple extraction — from **$200**. - Root canal (ant

### ✅ `us-hotel-guest`
- **Prompt:** What time is breakfast?
- **Preview:** ## Breakfast, Wi‑Fi, parking - Breakfast buffet **7:00 AM–10:30 AM** daily in the US Hotel In-Room Operations & Guest Desk Café · **$22** per adult if not included in rate ($12 kids under 12). - Complimentary Wi‑Fi network: **US Hotel In-Ro

### ✅ `us-sales-qualifier`
- **Prompt:** Tell me about the Growth plan.
- **Preview:** ## Plans & pricing ranges Prices are indicative monthly ranges for grounding; a human confirms the final quote. Currency: **USD ($)**. - **US Sales Qualifier Desk — Starter:** for very small teams (up to ~5 users). Typically from **$53/mont


## Notes

- Compare this live pass-rate to the mock `eval:suite:static` numbers — they measure different things.
- Semantic/embeddings retrieval remains optional; do not treat lexical-only failures as catalogue defects without a live re-run.
