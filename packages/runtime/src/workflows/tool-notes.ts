/**
 * A tool result's `note` field is dual-purpose: sometimes a genuine user-facing detail
 * (e.g. "limited stock", a real ticket status), but often an INTERNAL directive to the system —
 * sandbox stubs in particular carry hints like "Sandbox stub — prefer price from knowledge base"
 * or "Answer from the knowledge base policy sections". Those must never be echoed to a customer.
 *
 * Workflows that surface a tool result's note should pass it through here first: it returns the note
 * only when it is safe to show, otherwise `undefined` so the caller skips it (and falls back to its
 * own copy / knowledge base). Prod connectors return real notes, which pass through untouched.
 */
export function userFacingNote(note: unknown): string | undefined {
  if (typeof note !== "string") return undefined;
  const t = note.trim();
  if (!t) return undefined;
  // Internal steering / stub markers — directives about the knowledge base or the sandbox, or a
  // "no live X connected" degradation notice. None of these are meant for the end user.
  if (/\bsandbox stub\b|\bknowledge base\b|\bfrom knowledge\b|\banswer from\b|\brelay\b[\s\S]*\bfrom\b|no live\b[\s\S]*\bconnected\b/i.test(t)) {
    return undefined;
  }
  return t;
}
