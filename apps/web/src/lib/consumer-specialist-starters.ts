/**
 * Starter prompts for a consumer specialist's own chat page. Curated per agent so the first thing
 * a person sees fits THAT specialist (a study coach, an English coach…) rather than the general
 * assistant's email/calendar openers. Keyed by consumer agent id; a newly-certified agent with no
 * curated set still gets a couple of neutral openers via the fallback.
 */
const STARTERS: Record<string, string[]> = {
  "study-coach": [
    "Help me plan tonight's homework",
    "Explain this topic simply",
    "Quiz me on what I just studied",
    "I keep procrastinating — how do I start?",
  ],
  "english-coach": [
    "Let's practise a job interview in English",
    "Gently correct my grammar as we chat",
    "Teach me 5 useful phrases for work",
    "Help me sound more natural",
  ],
  "exam-prep-coach": [
    "Build me a revision plan for next week",
    "Give me past-paper practice on a topic",
    "Mark my practice answer honestly",
    "How do I handle exam-day nerves?",
  ],
  "private-confidant": [
    "I've had a rough day and need to talk",
    "Help me think through a hard decision",
    "I'm feeling anxious about tomorrow",
    "How do I bring something up with a friend?",
  ],
};

const FALLBACK = ["What can you help me with?", "How does this work?"];

export function specialistStarters(agentId: string): string[] {
  return STARTERS[agentId] ?? FALLBACK;
}
