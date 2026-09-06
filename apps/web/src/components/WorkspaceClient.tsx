"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Member = {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
  status: string;
  invitedAt: string;
  inviteToken?: string;
};

const ROLES = ["readonly", "agent", "admin", "owner"] as const;

export function WorkspaceClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"readonly" | "agent" | "admin">("agent");
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/members");
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setMembers(data.members ?? []);
      setWorkspaceId(data.workspaceId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    setBusy(true);
    setError(null);
    setLastInvite(null);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      setLastInvite(data.member);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/members/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    if (!window.confirm("Remove this member from the workspace?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/members/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Remove failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Workspace</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Team members and roles for this workspace. SSO / IdP remains the source of truth in
          production OIDC mode; this panel manages seats for mock and partner demos.
        </p>
        {workspaceId ? (
          <p className="font-mono text-[11px] text-[var(--muted)]">{workspaceId}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/history" className="text-[var(--accent-bright)] hover:underline">
          History
        </Link>
        <Link href="/insights" className="text-[var(--accent-bright)] hover:underline">
          Insights
        </Link>
        <Link href="/trust" className="text-[var(--accent-bright)] hover:underline">
          Trust &amp; DSAR
        </Link>
        <Link href="/ops" className="text-[var(--accent-bright)] hover:underline">
          Live Ops
        </Link>
      </div>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold text-[var(--text)]">Invite teammate</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          No email is sent yet — copy the invite token and share it out of band.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="input min-w-[14rem] flex-1"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="input text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="readonly">readonly</option>
            <option value="agent">agent</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={busy || !email.trim()}
            onClick={() => void invite()}
          >
            Invite
          </button>
        </div>
        {lastInvite?.inviteToken ? (
          <p className="mt-3 break-all rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-2 font-mono text-[11px] text-[var(--muted)]">
            Invite token: {lastInvite.inviteToken}
          </p>
        ) : null}
      </section>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading workspace members">
          <div className="overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--bg-panel)] p-4 space-y-3">
            <div className="flex gap-4 border-b border-[var(--line)] pb-3">
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 flex-1" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}

      {!loading && (
        <div className="overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--bg-panel)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-elev)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} className="border-t border-[var(--line)] hover:bg-[var(--bg-panel-hover)]/60 transition-colors">
                  <td className="px-3 py-2">
                    <div className="font-medium text-[var(--text)]">
                      {m.displayName || m.email}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--muted)]">{m.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input !px-2 !py-1 text-xs"
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => void changeRole(m.userId, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 capitalize text-[var(--muted)]">{m.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--muted)]">
                    {new Date(m.invitedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                      disabled={busy}
                      onClick={() => void remove(m.userId)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
