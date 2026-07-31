"use client";

const PACKS = [
  { id: "10" as const, usd: 10, label: "150,000 tokens" },
  { id: "20" as const, usd: 20, label: "420,000 tokens (+5%)" },
  { id: "100" as const, usd: 100, label: "2,750,000 tokens" },
  { id: "200" as const, usd: 200, label: "6,900,000 tokens" },
];

export function TopUpModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (tokens: number) => void;
}) {
  if (!open) return null;

  async function buy(packageId: (typeof PACKS)[number]["id"], usdAmount: number) {
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId, usdAmount }),
    });
    const data = await res.json();
    onDone(data.tokens);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-5 rise shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Top up prepaid tokens</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Same wallet as MyInstantAI general AI. Empty balance pauses agent replies.
            </p>
          </div>
          <button type="button" className="btn btn-ghost px-2 py-1" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="grid gap-2">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-3 text-left transition hover:border-[var(--accent-dim)]"
              onClick={() => buy(p.id, p.usd)}
            >
              <span>
                <span className="block font-medium">${p.usd}</span>
                <span className="text-xs text-[var(--muted)]">{p.label}</span>
              </span>
              <span className="text-sm text-[var(--accent)]">Add</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
