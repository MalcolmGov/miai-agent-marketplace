import { AppChatClient } from "./AppChatClient";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(v)) return v[0] || fallback;
  return (v && String(v).trim()) || fallback;
}

export default async function AppChannelPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const key = one(sp.key, "");
  const title = one(sp.title, "Assistant");
  const accent = one(sp.accent, "#2bb8a8");
  const accent2 = one(sp.accent2 ?? sp["accent-2"], "#157f8d");
  const greeting = one(
    sp.greeting,
    "Hi! I'm your AI assistant. Ask me anything, or say you'd like a human.",
  );
  const lang = one(sp.lang, "en");
  const sugRaw = one(
    sp.suggestions,
    "What do you offer?,How does it work?,Talk to a human",
  );
  const suggestions = sugRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <AppChatClient
      embedKey={key}
      title={title}
      accent={accent}
      accent2={accent2}
      greeting={greeting}
      suggestions={suggestions}
      lang={lang}
    />
  );
}
