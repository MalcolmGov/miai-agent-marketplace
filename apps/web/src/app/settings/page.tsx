import type { Metadata } from "next";
import { LanguageSelect } from "@/components/LanguageSelect";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Settings — MyInstantAI" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <header className="space-y-1 pt-2">
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--card-body)]">Language, appearance and account preferences.</p>
      </header>
      <section className="panel space-y-5 p-5">
        <div className="space-y-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Language</h2>
          <LanguageSelect />
        </div>
        <div className="space-y-2 border-t border-[var(--line)] pt-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Appearance</h2>
          <ThemeToggle />
        </div>
      </section>
    </div>
  );
}
