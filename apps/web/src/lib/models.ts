export const MODELS = [
  { id: "gemini-flash", label: "Flash", burn: "0.4×", blurb: "Fastest / cheapest" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", burn: "0.5×", blurb: "Balanced budget" },
  { id: "claude-sonnet", label: "Sonnet", burn: "1×", blurb: "Default quality" },
  { id: "gpt-4o", label: "GPT-4o", burn: "1.6×", blurb: "Strong reasoning" },
  { id: "claude-opus", label: "Opus", burn: "3×", blurb: "Highest quality" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];
