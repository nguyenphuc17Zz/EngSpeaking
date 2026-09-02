// Bottleneck prioritization for curriculum §14, §21
import type { SkillState } from "@/types/learner";

export interface CurriculumBottleneck {
  skillId: string;
  severity: number;
  impact: number;
  recurrence: number;
  confidence: number;
  reason: string;
  priority: number;
}

export function rankBottlenecks(
  weaknesses: Array<{ skillId: string; severity: number; impact: number; recurrence: number; confidence: number }>,
  goalRelevanceMap: Map<string, number>
): CurriculumBottleneck[] {
  return weaknesses
    .map((w) => {
      const goalRel = goalRelevanceMap.get(w.skillId) || 0.5;
      // §21: severity × impact × recurrence × goal relevance × confidence
      const priority = w.severity * 0.3 + w.impact * 0.25 + w.recurrence * 0.2 + goalRel * 100 * 0.15 + w.confidence * 100 * 0.1;
      return { ...w, priority: Math.round(priority), reason: `severity ${w.severity}, impact ${w.impact}, recurrence ${w.recurrence}` };
    })
    .sort((a, b) => b.priority - a.priority);
}
