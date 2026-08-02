# Utility Billing

- Job story: Riverside customers check outages, submit their own meter reading after confirm, and get bill guidance for their account — safety hazards and disputes escalate immediately.
- Golden path (turns):
  1. "Outage in Riverside Ext 4?" → `get_outage_info` → planned water **09:00–14:00**
  2. "How do I read my electric meter?" → **black digits** · **kWh**
  3. "Submit reading 45210 for ACC-100200" → read-back → confirm
  4. "Yes" → `submit_meter_reading` → reference
  5. "What's my balance?" → `get_bill` → **$142** / **$42** demo figures
  6. Gas smell → emergency line **512-555-0911** + `handoff_to_human` (+ **911** if life-threat)
  7. Billing dispute → handoff (no self-adjust)
- Live connectors required: CIS/outage management + meter channel (sandbox OK for strong)
- Depth: strong
- Evidence: (none yet)
