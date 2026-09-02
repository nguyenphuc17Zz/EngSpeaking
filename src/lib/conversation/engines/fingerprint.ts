import type { ScenarioBlueprint } from "@/types/conversation-world";
import { scenarioFingerprint } from "@/lib/conversation/services/scenario.service";

const RECENT_FINGERPRINTS_KEY = "conversation_fingerprints";
const MAX_RECENT = 20;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_FINGERPRINTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveRecent(list: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(RECENT_FINGERPRINTS_KEY, JSON.stringify(list.slice(-MAX_RECENT))); } catch {}
}

export function isDuplicateScenario(scenario: ScenarioBlueprint): boolean {
  const fp = scenarioFingerprint(scenario);
  const recent = loadRecent();
  return recent.includes(fp);
}

export function rememberScenario(scenario: ScenarioBlueprint): void {
  const fp = scenarioFingerprint(scenario);
  const recent = loadRecent();
  if (!recent.includes(fp)) {
    recent.push(fp);
    saveRecent(recent);
  }
}

export function clearFingerprints(): void {
  if (typeof window !== "undefined") localStorage.removeItem(RECENT_FINGERPRINTS_KEY);
}
