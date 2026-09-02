// Foundation progress — lightweight, real scores §49, prepares Phase 5
import type { FoundationProfile, FoundationSkill } from "@/types/foundation";

const STORAGE_KEY = "foundation_profile";
const HISTORY_KEY = "foundation_history";

function defaultProfile(): FoundationProfile {
  return {
    overallProduction: 45,
    sentenceRetrieval: 45,
    responseSpeed: 45,
    fluency: 45,
    confidence: 50,
    vocabularyActivation: 45,
    grammarInSpeech: 45,
    expansionAbility: 40,
    recoveryAbility: 45,
    translationDependency: 60,
    updatedAt: new Date().toISOString(),
  };
}

function loadProfile(): FoundationProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultProfile();
}

function saveProfile(p: FoundationProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a * (1 - t) + b * t);
}

export function getFoundationProfile(): FoundationProfile {
  return loadProfile();
}

export function updateFoundationProfileFromScore(skill: FoundationSkill, overall: number, opts?: { translationDependency?: number }): FoundationProfile {
  const p = loadProfile();
  const t = 0.22; // smoothing
  const next: FoundationProfile = { ...p, updatedAt: new Date().toISOString() };
  // overallProduction moves slower
  next.overallProduction = lerp(p.overallProduction, overall, 0.12);
  // per skill
  const map: Record<string, keyof FoundationProfile> = {
    sentence_retrieval: "sentenceRetrieval",
    response_speed: "responseSpeed",
    controlled_speaking: "fluency",
    confidence: "confidence",
    active_vocabulary: "vocabularyActivation",
    grammar_in_speech: "grammarInSpeech",
    sentence_expansion: "expansionAbility",
    recovery: "recoveryAbility",
  };
  const key = map[skill];
  if (key) (next as unknown as Record<string, number>)[key] = lerp((p as unknown as Record<string, number>)[key] as number, overall, t);
  else {
    // distribute small to all
    next.sentenceRetrieval = lerp(p.sentenceRetrieval, overall, 0.08);
    next.fluency = lerp(p.fluency, overall, 0.08);
  }
  if (opts?.translationDependency != null) next.translationDependency = lerp(p.translationDependency, opts.translationDependency, 0.2);
  saveProfile(next);
  // history for skill progress bars
  try {
    const histRaw = localStorage.getItem(HISTORY_KEY);
    const hist: Record<string, number[]> = histRaw ? JSON.parse(histRaw) : {};
    if (!hist[skill]) hist[skill] = [];
    hist[skill].push(overall);
    if (hist[skill].length > 30) hist[skill] = hist[skill].slice(-30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch {}
  return next;
}

export function getSkillProgress(skill: FoundationSkill): { value: number; history: number[] } {
  const p = loadProfile();
  const map: Record<string, number> = {
    sentence_retrieval: p.sentenceRetrieval,
    chunk_retrieval: p.sentenceRetrieval,
    sentence_construction: p.grammarInSpeech,
    sentence_expansion: p.expansionAbility,
    substitution: p.sentenceRetrieval,
    speaking_repetition: p.overallProduction,
    shadowing: p.fluency,
    controlled_speaking: p.fluency,
    response_speed: p.responseSpeed,
    active_vocabulary: p.vocabularyActivation,
    grammar_in_speech: p.grammarInSpeech,
    conversation_followup: p.fluency,
    micro_monologue: p.fluency,
    recovery: p.recoveryAbility,
    self_correction: p.grammarInSpeech,
    confidence: p.confidence,
  };
  let hist: number[] = [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) hist = (JSON.parse(raw)[skill] as number[]) || [];
  } catch {}
  return { value: map[skill] ?? p.overallProduction, history: hist };
}
