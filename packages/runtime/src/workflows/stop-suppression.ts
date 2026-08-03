/**
 * Shared STOP/opt-out suppression detector for workflow modules.
 *
 * Explicit non-capturing groups make the intended operator precedence
 * unambiguous: a leading "stop" triggers narrowly (so "please stop the
 * noise" doesn't false-positive), while "unsubscribe" and "don't text/
 * message me" trigger anywhere in the message.
 */
export const STOP_SUPPRESSION_PATTERN =
  /(?:^\s*stop\b)|(?:unsubscribe)|(?:don't (?:text|message) me)/;

export interface StopSuppressionToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface StopSuppressionResult {
  handled: true;
  toolCalls: StopSuppressionToolCall[];
  assistantMessage: string;
}

export interface StopSuppressionInput {
  /** Lowercased, trimmed user message (workflows already compute this once). */
  lower: string;
  /** Original trimmed user message, used for the handoff summary. */
  user: string;
  has: (toolName: string) => boolean;
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ ok: boolean; data: unknown }>;
  /** Override the default acknowledgement copy; keeps existing per-family wording intact. */
  assistantMessage?: string;
}

const DEFAULT_MESSAGE =
  "Understood — STOP acknowledged. Handing off so suppression is completed.";

/**
 * Returns a ready-to-return workflow turn result when the message is a
 * STOP/opt-out, or `null` when it isn't a match.
 */
export async function handleStopSuppression(
  input: StopSuppressionInput,
): Promise<StopSuppressionResult | null> {
  if (!STOP_SUPPRESSION_PATTERN.test(input.lower)) return null;
  const toolCalls: StopSuppressionToolCall[] = [];
  if (input.has("handoff_to_human")) {
    const args = { reason: "stop_suppression", summary: input.user.slice(0, 200) };
    const result = await input.executeTool("handoff_to_human", args);
    toolCalls.push({ name: "handoff_to_human", args, result: result.data });
  }
  return {
    handled: true,
    toolCalls,
    assistantMessage: input.assistantMessage ?? DEFAULT_MESSAGE,
  };
}
