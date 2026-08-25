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
  "matchday-companion": [
    "How did this weekend's football go?",
    "Help me pick my fantasy team",
    "When does my club play next?",
    "Settle a football debate for me",
  ],
  "learning-advisor": [
    "Help me choose a course after school",
    "Find bursaries I could apply for",
    "Coach me on my application essay",
    "What careers fit what I enjoy?",
  ],
  "health-navigator": [
    "I've had a headache and fever — should I see someone?",
    "What might cause these symptoms?",
    "Explain what this medication is for",
    "When is a symptom an emergency?",
  ],
  "money-coach": [
    "Help me budget until my next payout",
    "Make me a plan to pay off a debt",
    "Set me a savings challenge",
    "Where is my money going each month?",
  ],
  "faith-companion": [
    "Give me a short devotional for today",
    "Explain this scripture passage",
    "Help me outline a sermon",
    "A prayer for a hard day",
  ],
  "paperwork-navigator": [
    "Help me understand a SASSA grant form",
    "Draft an affidavit for me",
    "Write a formal complaint letter",
    "What documents do I need for this?",
  ],
  "job-hunt-coach": [
    "Give me feedback on my CV",
    "Write a cover letter for this job",
    "Practise an interview with me",
    "How do I explain a gap in my work history?",
  ],
  "everyday-companion": [
    "Let's just chat — how's your day?",
    "Play a quick word game with me",
    "Remember that I prefer early mornings",
    "Cheer me up",
  ],
  "topup-concierge": [
    "Find me the best data deal",
    "Compare airtime bundles",
    "What's a good gift-card option?",
    "How do remittance rates compare?",
  ],
  "story-studio": [
    "Let's build a fantasy world together",
    "Help me create a character",
    "Co-write the opening of a story",
    "Give me a plot twist",
  ],
  "trip-planner": [
    "Plan a 3-day trip to Cape Town",
    "Suggest a weekend getaway on a budget",
    "Build me a day-by-day itinerary",
    "What's worth seeing near me?",
  ],
  "fitness-meal-coach": [
    "Make me a beginner workout plan",
    "Suggest healthy meals for the week",
    "A quick home workout, no equipment",
    "Help me log today's meal",
  ],
  "star-guide": [
    "What's my horoscope today?",
    "Pull a tarot card for me",
    "Are my sign and my partner's compatible?",
    "What's my star sign known for?",
  ],
};

const FALLBACK = ["What can you help me with?", "How does this work?"];

export function specialistStarters(agentId: string): string[] {
  return STARTERS[agentId] ?? FALLBACK;
}
