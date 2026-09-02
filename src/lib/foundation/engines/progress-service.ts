// FoundationProgressService §48-49 — skill-level tracking
import type { FoundationProfile, FoundationSkill } from "@/types/foundation";

export interface FoundationProgressService {
  getProfile(): Promise<FoundationProfile>;
  updateFromEvaluation(skill: FoundationSkill, overall: number, opts?: { translationDependency?: number }): Promise<FoundationProfile>;
  getSkillProgress(skill: FoundationSkill): Promise<{ value: number; history: number[] }>;
}
