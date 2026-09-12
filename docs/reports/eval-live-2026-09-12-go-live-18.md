# Live-LLM eval sample — 2026-09-12

**Not a CI gate.** MockModel suite pass-rates do **not** equal live quality.

| Field | Value |
|---|---|
| Model mode | `anthropic` |
| Sample size | 18 |
| Live pass | 17/18 (94.4%) |
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

### ✅ `us-dental-front-desk`
- **Prompt:** What treatments do you offer?
- **Preview:** ## Treatments & fees (private / cash pay) - Comprehensive exam & cleaning — 45 min — **$150**. - Child cleaning (under 14) — 30 min — **$95**. - Filling (tooth-colored) — from **$175**. - Simple extraction — from **$200**. - Root canal (ant

### ✅ `us-hotel-guest`
- **Prompt:** What time is breakfast?
- **Preview:** ## Breakfast, Wi‑Fi, parking - Breakfast buffet **7:00 AM–10:30 AM** daily in the US Hotel In-Room Operations & Guest Desk Café · **$22** per adult if not included in rate ($12 kids under 12). - Complimentary Wi‑Fi network: **US Hotel In-Ro

### ✅ `us-executive-assistant`
- **Prompt:** What's on my calendar tomorrow?
- **Preview:** I can't pull that up live just now — that connection isn't fully set up on our side yet. I've flagged it so a teammate can help.

### ✅ `us-it-helpdesk`
- **Prompt:** My laptop won't connect to VPN.
- **Preview:** ## VPN & remote access - VPN client: **GlobalProtect** — install from the IT Portal, **portal.example.com**.   Example (fictional — replace with your details): the tenant's IT portal URL. - Gateway: **vpn.example.com**. Example (fictional —

### ✅ `us-sales-qualifier`
- **Prompt:** Tell me about the Growth plan.
- **Preview:** ## Plans & pricing ranges Prices are indicative monthly ranges for grounding; a human confirms the final quote. Currency: **USD ($)**. - **US Sales Qualifier Desk — Starter:** for very small teams (up to ~5 users). Typically from **$53/mont

### ✅ `us-salon-booking`
- **Prompt:** Can I book a haircut Saturday morning?
- **Preview:** Yes, I can help you book a haircut for Saturday morning!  **Saturday hours:** 8:00 AM – 5:00 PM  Based on our services, we offer haircuts starting at **$35**. To proceed with your booking, I'll need a few details:  1. **What time Saturday m

### ✅ `us-home-services`
- **Prompt:** I need a plumber this week.
- **Preview:** I'd be happy to help you schedule a plumber this week!   To find available appointment times, I need a bit more information:  1. **What specific plumbing service do you need?** For example:    - Drain clearing (from $129)    - Water heater 

### ✅ `us-clinic-front-desk`
- **Prompt:** What should I bring to my first visit?
- **Preview:** For your first visit to our clinic, please bring:  1. **Insurance card** – We accept most major medical and dental insurance plans, and we'll need your card to verify coverage.  2. **Photo ID** – A driver's license, state ID, or passport.  

### ✅ `us-restaurant-takeaway`
- **Prompt:** Do you offer gluten-free options?
- **Preview:** Thank you for asking about gluten-free options!  I need to be transparent with you: **gluten is present in our kitchen**, so we cannot guarantee completely gluten-free preparation for those with celiac disease or severe gluten sensitivity. 

### ✅ `us-customer-support`
- **Prompt:** How do I reset my password?
- **Preview:** I'd be happy to help you reset your password!  To reset your password, please follow these steps:  1. **Go to the login page** on our website 2. **Click "Forgot Password?"** (usually located below the login fields) 3. **Enter your email add

### ✅ `us-delivery-tracking`
- **Prompt:** Where is my package?
- **Preview:** I can track that — what's the waybill / tracking number?

### ✅ `us-trades-receptionist`
- **Prompt:** Emergency plumbing — can someone come out?
- **Preview:** If this is life-threatening or an emergency, call **911** / local emergency services now. I'm also handing you to a human teammate urgently.

### ✅ `us-onboarding-buddy`
- **Prompt:** What do I do on my first day?
- **Preview:** Great question! Here's what you need to know for your **first day**:  ## Arrival & Check-In - **Arrive at 08:30** (a few minutes early is ideal) - **Go to reception on the 3rd floor** and ask for the People team - Your **onboarding buddy** 


## Notes

- Compare this live pass-rate to the mock `eval:suite:static` numbers — they measure different things.
- Semantic/embeddings retrieval remains optional; do not treat lexical-only failures as catalogue defects without a live re-run.
