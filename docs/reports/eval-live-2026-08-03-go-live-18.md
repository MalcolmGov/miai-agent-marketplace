# Live-LLM eval sample — 2026-08-03

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
- **Preview:** ## Filing deadlines — general guide only > General guideline dates for planning — not advice about any client's specific obligations. > The agent fetches this list with `get_deadlines`. - **Monthly payroll tax deposits (example guide):** ma

### ✅ `us-events-venue`
- **Prompt:** What wedding packages do you offer?
- **Preview:** ## Packages & pricing Starting prices; the events team confirms a detailed quote. `get_packages` returns this list.  - **Intimate** — up to 50 guests — from **USD 25000** / **$25000** (USD 25,000). Wedding.   Includes: venue hire, tables an

### ✅ `us-building-management`
- **Prompt:** How much is the monthly levy for a 2-bedroom?
- **Preview:** ## Levy schedule & payment Monthly HOA levies (dues) are due on the **1st of each month**. Quote these exact figures:  - **1-bedroom unit** — **USD 1450** / **$1450** per month (USD 1,450) - **2-bedroom unit** — **USD 1980** / **$1980** per

### ✅ `us-pharmacy`
- **Prompt:** Do you have Panado 500mg in stock?
- **Preview:** I checked OTC stock for that item. If you need a prescription refill logged, share the RX number and your name/phone.

### ✅ `us-gym-membership`
- **Prompt:** What memberships do you offer?
- **Preview:** ## Membership plans & pricing Monthly fees. `get_plans` returns this same list.  - **Off-Peak** — **USD 17** / **$17**/month — gym floor Mon–Fri 05:00–16:00 plus all weekend hours.   No group classes included (classes **USD 3** / **$3** eac

### ✅ `us-dental-front-desk`
- **Prompt:** What treatments do you offer?
- **Preview:** ## Treatments & fees (private / cash pay) - Comprehensive exam & cleaning — 45 min — **$150**. - Child cleaning (under 14) — 30 min — **$95**. - Filling (tooth-colored) — from **$175**. - Simple extraction — from **$200**. - Root canal (ant

### ❌ `us-hotel-guest`
- **Prompt:** What time is breakfast?
- **Preview:** ## Check-in

### ✅ `us-executive-assistant`
- **Prompt:** What's on my calendar tomorrow?
- **Preview:** Tomorrow (Tuesday, August 4th) you have:  - **Weekly team standup** at 9:00–9:30 AM - **Lunch block** at 12:30–1:00 PM  You're free 10:00 AM–12:00 PM and 2:00–4:00 PM if you need to add anything.

### ✅ `us-it-helpdesk`
- **Prompt:** My laptop won't connect to VPN.
- **Preview:** ## VPN & remote access - VPN client: **GlobalProtect** — install from the IT Portal, **portal.northwinddigital.com**.   Example (replace): the tenant's IT portal URL. - Gateway: **vpn.northwinddigital.com**. Example (replace): the tenant's 

### ✅ `us-sales-qualifier`
- **Prompt:** Tell me about the Growth plan.
- **Preview:** ## Plans & pricing ranges Prices are indicative monthly ranges for grounding; a human confirms the final quote. Currency: **USD ($)**. - **Ledgerly — Starter:** for very small teams (up to ~5 users). Typically from **$53/month**.   Core inv

### ✅ `us-salon-booking`
- **Prompt:** Can I book a haircut Saturday morning?
- **Preview:** Absolutely! Saturday mornings work well — we're open **8:00 AM–5:00 PM on Saturdays**.  Let me check what times are available for a haircut this Saturday (August 9th). Do you have a preferred time, or would you like me to show you the open 

### ✅ `us-home-services`
- **Prompt:** I need a plumber this week.
- **Preview:** I'd be happy to help you schedule a plumber this week!   To find you the best available time, I need a couple of quick details:  1. **What plumbing service do you need?** (For example: drain clearing, water heater issue, leak repair, etc.) 

### ✅ `us-clinic-front-desk`
- **Prompt:** What should I bring to my first visit?
- **Preview:** For your first visit to our practice, please bring:  1. **Insurance card** – We accept most major medical and dental insurance plans. 2. **Photo ID** – A driver's license or other government-issued ID. 3. **Any referral forms** – If your in

### ✅ `us-restaurant-takeaway`
- **Prompt:** Do you offer gluten-free options?
- **Preview:** We do have some dishes that may work for gluten-free needs, but I need to be upfront: gluten is present in our kitchen, so we can't guarantee complete freedom from cross-contact.  That said, many of our grilled items (steaks, chicken, ribs)

### ✅ `us-customer-support`
- **Prompt:** How do I reset my password?
- **Preview:** I appreciate you reaching out! However, I don't have access to password reset tools or account management systems directly.  Here's what I can do to help:  **For your online account password**, you'll typically find a "Forgot Password" or "

### ✅ `us-delivery-tracking`
- **Prompt:** Where is my package?
- **Preview:** I can track that — what's the waybill / tracking number?

### ✅ `us-trades-receptionist`
- **Prompt:** Emergency plumbing — can someone come out?
- **Preview:** If this is life-threatening or an emergency, call **911** / local emergency services now. I'm also handing you to a human teammate urgently.

### ✅ `us-onboarding-buddy`
- **Prompt:** What do I do on my first day?
- **Preview:** **On your first day:**  - **Arrive at 08:30** (a few minutes early is good) - Go to **reception on the 3rd floor** and ask for the People team — your onboarding buddy will meet you there - Bring your **government ID** and any certificates P


## Notes

- Compare this live pass-rate to the mock `eval:suite:static` numbers — they measure different things.
- Semantic/embeddings retrieval remains optional; do not treat lexical-only failures as catalogue defects without a live re-run.
