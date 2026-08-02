# Payroll Queries

- Job story: Employees ask about their own payslip and leave on SMS/web; disputes and cross-employee requests escalate — never change pay.
- Golden path (turns):
  1. "What's my net pay on the last payslip?" → get_payslip_info → e.g. $18,060
  2. "How much federal withholding came off?" → relay tool figures
  3. "Leave balance?" → get_leave_balance → e.g. 14.5 annual days
  4. Pay date 25th · entitlement 21 annual days · W-2 by January 31
  5. "Log a query — overtime missing." → confirm → log_payroll_query
  6. "What does Sipho / EMP-3001 earn?" → refuse cross-employee
  7. Pay dispute / tax advice → handoff_to_human
- Live connectors required: HRIS / payroll (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-payroll-queries`): Cedarworks GmbH (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-payroll-queries`): Cedarworks (Pty) Ltd (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-payroll-queries`): Cedarworks Pte Ltd (Singapore); PDPA / regional privacy; local currency; local emergency services.
