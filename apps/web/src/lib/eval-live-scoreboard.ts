import { promises as fs } from "node:fs";
import path from "node:path";

export type ScoreboardResult = {
  agentId: string;
  ok: boolean;
  prompt: string;
  preview: string;
};

export type ScoreboardSet = {
  id: string;
  label: string;
  reportFile: string;
  date: string;
  modelMode: string;
  passed: number;
  total: number;
  rate: number;
  results: ScoreboardResult[];
};

export type ScoreboardPayload = {
  version: number;
  updatedAt: string;
  disclaimer: string;
  coverageNote: string;
  sets: ScoreboardSet[];
  connectorProofs: {
    agentsProven: number;
    sliceTarget: number;
    connectors: string[];
    proofs: Array<{
      agentId: string;
      connector: string;
      correlationId: string;
      at: string;
      notes: string;
    }>;
  };
};

function scoreboardPath(): string {
  return path.resolve(process.cwd(), process.env.SCOREBOARD_PATH ?? "../../data/reports/eval-live-scoreboard.json");
}

export async function loadEvalLiveScoreboard(): Promise<ScoreboardPayload | null> {
  try {
    const raw = await fs.readFile(scoreboardPath(), "utf8");
    return JSON.parse(raw) as ScoreboardPayload;
  } catch {
    return null;
  }
}
