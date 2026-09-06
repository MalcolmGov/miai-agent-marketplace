"use client";

type Point = { label?: string; value: number };

export function AreaChart({
  points,
  height = 200,
  xLabels,
  ariaLabel = "Conversations trend",
}: {
  points: Point[];
  height?: number;
  xLabels?: [string, string, string];
  ariaLabel?: string;
}) {
  const w = 640;
  const h = height;
  const pad = { t: 16, r: 12, b: 28, l: 8 };
  const max = Math.max(...points.map((p) => p.value), 1);
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const coords = points.map((p, i) => {
    const x = pad.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.t + innerH - (p.value / max) * innerH;
    return { x, y };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1]!.x.toFixed(1)},${(pad.t + innerH).toFixed(1)} L${coords[0]!.x.toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`;
  const labels = xLabels ?? ["2 wks ago", "1 wk ago", "today"];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--accent-bright)"
        strokeWidth="2.5"
        filter="url(#glow)"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {labels.map((lab, i) => {
        const x = pad.l + (i / 2) * innerW;
        return (
          <text
            key={lab}
            x={x}
            y={h - 6}
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
            className="fill-[var(--muted)]"
            style={{ fontSize: 11 }}
          >
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

export function HBarChart({
  rows,
}: {
  rows: Array<{ label: string; pct: number }>;
}) {
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-[var(--text)]">{r.label}</span>
            <span className="font-semibold text-[var(--accent-bright)]">{r.pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elev)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-dim)] to-[var(--accent-bright)]"
              style={{ width: `${Math.min(100, r.pct)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function niceAxisMax(raw: number): number {
  if (raw <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * exp;
}

export function LineTrendChart({
  points,
  valueLabel,
}: {
  points: Array<{ month: string; value: number }>;
  valueLabel?: string;
}) {
  const w = 720;
  const h = 220;
  const pad = { t: 36, r: 24, b: 32, l: 56 };
  const max = niceAxisMax(Math.max(...points.map((p) => p.value), 0));
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const coords = points.map((p, i) => {
    const x = pad.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.t + innerH - (Math.min(p.value, max) / max) * innerH;
    return { x, y, ...p };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1]!;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" role="img" aria-label="Token revenue trend">
      <defs>
        <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {yTicks.map((t) => {
        const y = pad.t + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-[var(--muted)]" style={{ fontSize: 11 }}>
              {formatUsdAxis(t)}
            </text>
          </g>
        );
      })}
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#dotGlow)"
      />
      <line
        x1={last.x}
        x2={last.x}
        y1={pad.t}
        y2={pad.t + innerH}
        stroke="var(--accent)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.55"
      />
      <circle cx={last.x} cy={last.y} r="6" fill="var(--accent-bright)" filter="url(#dotGlow)" />
      <text
        x={last.x}
        y={last.y - 14}
        textAnchor="middle"
        className="fill-[var(--text)]"
        style={{ fontSize: 14, fontWeight: 600 }}
      >
        {valueLabel ?? formatUsd(last.value)}
      </text>
      {coords.map((c) => (
        <text
          key={c.month}
          x={c.x}
          y={h - 8}
          textAnchor="middle"
          className="fill-[var(--muted)]"
          style={{ fontSize: 11 }}
        >
          {c.month}
        </text>
      ))}
    </svg>
  );
}

function formatUsdAxis(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  if (n === 0) return "$0";
  return `$${Math.round(n)}`;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const s = (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "");
    return `${s}M`;
  }
  if (n >= 1_000) {
    const s = (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "");
    return `${s}k`;
  }
  return n.toLocaleString();
}

export function formatUsd(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (opts?.compact && Math.abs(n) >= 10_000) {
    return `$${Math.round(n / 1000)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
  }).format(n);
}
