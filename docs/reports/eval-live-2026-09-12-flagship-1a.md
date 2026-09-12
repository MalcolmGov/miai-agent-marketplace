# Live-LLM eval sample — 2026-09-12

**Not a CI gate.** MockModel suite pass-rates do **not** equal live quality.

| Field | Value |
|---|---|
| Model mode | `anthropic` |
| Sample size | 5 |
| Live pass | 4/5 (80.0%) |
| MockModel answer-injection | **not used** (live adapter only) |
| Retrieval | lexical (default); semantic path optional / flag-gated |

## Results

### ✅ `us-accounting-practice`
- **Prompt:** When is monthly payroll tax due?
- **Preview:** ## Filing deadlines — general guide only - **Monthly payroll tax deposits (example guide):** many small employers remit by the **7th** of the   following month when using a monthly schedule — confirm with your accountant / IRS schedule.   (

### ✅ `us-events-venue`
- **Prompt:** What wedding packages do you offer?
- **Preview:** ## Packages & pricing  - **Intimate** — up to 50 guests — from **USD 25000** / **$25000** (USD 25,000). Wedding.   Includes: venue hire, tables and chairs, basic setup, day coordinator. - **Classic wedding** — up to 120 guests — from **USD 

### ✅ `us-building-management`
- **Prompt:** How much is the monthly levy for a 2-bedroom?
- **Preview:** ## Levy schedule & payment Monthly HOA levies (dues) are due on the **1st of each month**. Quote these exact figures:  - **1-bedroom unit** — **USD 1450** / **$1450** per month (USD 1,450) - **2-bedroom unit** — **USD 1980** / **$1980** per

### ❌ `us-pharmacy`
- **Prompt:** Do you have Panado 500mg in stock?
- **Preview:** Panado 500mg in stock is **in stock**.

### ✅ `us-gym-membership`
- **Prompt:** What memberships do you offer?
- **Preview:** ## Membership plans & pricing  - **Off-Peak** — **USD 17** / **$17**/month — gym floor Mon–Fri 05:00–16:00 plus all weekend hours.   No group classes included (classes **USD 3** / **$3** each, or upgrade). Month-to-month. - **Standard** — *


## Notes

- Compare this live pass-rate to the mock `eval:suite:static` numbers — they measure different things.
- Semantic/embeddings retrieval remains optional; do not treat lexical-only failures as catalogue defects without a live re-run.
