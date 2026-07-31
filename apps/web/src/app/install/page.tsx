export default function InstallPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Install agent.js</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          One script tag. Floating chat on your site. Tokens debit from the same prepaid wallet.
        </p>
      </div>
      <div className="panel space-y-3 p-5 text-sm leading-relaxed text-[var(--muted)]">
        <p>
          1. Open an agent → <strong className="text-[var(--text)]">Rent & configure</strong> →{" "}
          <strong className="text-[var(--text)]">Install</strong>.
        </p>
        <p>2. Copy the snippet (includes your <code className="text-[var(--accent)]">mia_pk_…</code> key).</p>
        <pre className="overflow-x-auto rounded-lg bg-[#0d1219] p-3 text-xs text-[var(--accent)]">{`<script src="https://YOUR_HOST/agents/v1/agent.js" data-key="mia_pk_…" async></script>`}</pre>
        <p>
          3. Paste on WordPress, Shopify, or Wix as documented on the agent Install tab. Customers chat;
          tools run through your Connector Hub bindings.
        </p>
        <p>
          Endpoint served at <code className="text-[var(--accent)]">/agents/v1/agent.js</code> — matches
          the MyInstantAI embed path in PLATFORM_INTEGRATION.md.
        </p>
      </div>
    </div>
  );
}
