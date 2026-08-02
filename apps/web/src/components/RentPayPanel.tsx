"use client";

import { useMemo, useState } from "react";
import { TIER_PRICES } from "@/lib/constants";

type TierId = keyof typeof TIER_PRICES;
type PayPhase = "plan" | "card" | "processing" | "done";

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatCardNumber(raw: string) {
  const d = onlyDigits(raw).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const d = onlyDigits(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function luhnOk(num: string) {
  const digits = onlyDigits(num);
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function RentPayPanel({
  tier,
  onTierChange,
  rented,
  saving,
  message,
  onPayAndActivate,
  onContinueLive,
}: {
  tier: TierId;
  onTierChange: (tier: TierId) => void;
  rented: boolean;
  saving: boolean;
  message: { kind: "ok" | "err"; text: string } | null;
  onPayAndActivate: () => Promise<boolean>;
  onContinueLive: () => void;
}) {
  const [phase, setPhase] = useState<PayPhase>(rented ? "done" : "plan");
  const [name, setName] = useState("Malcolm Govender");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const price = TIER_PRICES[tier];
  const cardDigits = onlyDigits(card);
  const brand = useMemo(() => {
    if (cardDigits.startsWith("4")) return "Visa";
    if (cardDigits.startsWith("5")) return "Mastercard";
    if (cardDigits.startsWith("3")) return "Amex";
    return "Card";
  }, [cardDigits]);

  function validateCard(): string | null {
    if (name.trim().length < 2) return "Enter the name on the card.";
    if (!luhnOk(cardDigits)) return "Enter a valid card number (try 4242 4242 4242 4242).";
    const [mm, yy] = expiry.split("/");
    const month = Number(mm);
    const year = Number(yy);
    if (!month || month < 1 || month > 12 || !year || String(yy ?? "").length !== 2) {
      return "Enter expiry as MM/YY.";
    }
    if (onlyDigits(cvc).length < 3) return "Enter a 3-digit CVC.";
    return null;
  }

  async function submitPay() {
    const err = validateCard();
    if (err) {
      setLocalErr(err);
      return;
    }
    setLocalErr(null);
    setPhase("processing");
    // Mock gateway latency — no real charge
    await new Promise((r) => setTimeout(r, 1200));
    const ok = await onPayAndActivate();
    if (ok) {
      setPhase("done");
    } else {
      setPhase("card");
      setLocalErr("Payment mock succeeded, but activating the plan failed. Try again.");
    }
  }

  if (phase === "done" || rented) {
    return (
      <div id="rent-pay" className="panel mx-auto max-w-lg space-y-4 p-5 scroll-mt-24">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">
            ✓
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Payment complete</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Plan <span className="font-medium text-[var(--text)]">{tier}</span> is active
              {price != null ? ` ($${price}/mo mock)` : ""}. Next: go live and activate on your website
              or app.
            </p>
          </div>
        </div>
        {message?.kind === "ok" ? (
          <p className="text-xs text-[var(--accent)]">{message.text}</p>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={onContinueLive}>
          Continue — Go live and activate
        </button>
      </div>
    );
  }

  return (
    <div id="rent-pay" className="panel mx-auto max-w-lg space-y-4 p-5 scroll-mt-24">
      <div>
        <h2 className="text-sm font-semibold">Rent + Pay</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Choose a plan and complete a <span className="text-[var(--text)]">mock card payment</span>.
          No real charge — demo checkout only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Plan">
        {(Object.keys(TIER_PRICES) as TierId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`chip ${tier === id ? "chip-live" : ""}`}
            onClick={() => onTierChange(id)}
          >
            {id} ${TIER_PRICES[id]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2.5 text-xs text-[var(--muted)]">
        <div className="flex items-center justify-between gap-2">
          <span>Due today (mock)</span>
          <span className="text-sm font-semibold text-[var(--text)]">${price}.00</span>
        </div>
        <p className="mt-1">Includes workspace entitlement for this agent. Tokens billed separately.</p>
      </div>

      {phase === "plan" ? (
        <button type="button" className="btn btn-primary w-full" onClick={() => setPhase("card")}>
          Continue to payment
        </button>
      ) : null}

      {phase === "card" || phase === "processing" ? (
        <fieldset disabled={phase === "processing" || saving} className="space-y-3">
          <legend className="sr-only">Card details</legend>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-dim)]">
              Name on card
            </span>
            <input
              className="input"
              autoComplete="cc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-dim)]">
              Card number · {brand}
            </span>
            <input
              className="input font-mono tracking-wider"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              value={card}
              onChange={(e) => setCard(formatCardNumber(e.target.value))}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-dim)]">
                Expiry
              </span>
              <input
                className="input font-mono"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-dim)]">
                CVC
              </span>
              <input
                className="input font-mono"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(onlyDigits(e.target.value).slice(0, 4))}
              />
            </label>
          </div>

          {(localErr || message?.kind === "err") && (
            <p className="text-xs text-red-400">{localErr ?? message?.text}</p>
          )}

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={phase === "processing" || saving}
            onClick={() => void submitPay()}
          >
            {phase === "processing" || saving
              ? "Processing mock payment…"
              : `Pay $${price}.00 (mock)`}
          </button>
          <button type="button" className="btn btn-ghost w-full text-xs" onClick={() => setPhase("plan")}>
            Back to plan
          </button>
          <p className="text-[11px] text-[var(--muted)]">
            Demo tip: use Visa test card <code className="text-[var(--accent)]">4242…</code> — nothing
            is charged.
          </p>
        </fieldset>
      ) : null}
    </div>
  );
}
