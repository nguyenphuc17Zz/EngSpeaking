// Heart of Phase 5 §18 — hybrid deterministic + AI
import type { LearnerState, LearningAction, LearningSessionPlan, LearningBlock } from "@/types/learner";
import { getCompactSnapshot, loadLearnerState } from "./learner-state-service";
import { getSkillsForGoal, reconcileGoalAndDiagnosis } from "./goal-mapping";
import { arePrerequisitesSatisfied } from "./skill-graph";
import { generateTextWithRouting } from "@/lib/ai";
import { NEXT_ACTION_SYSTEM, buildNextActionPrompt } from "./prompts/teacher/next-action";
import { SESSION_PLANNER_SYSTEM, buildSessionPlannerPrompt } from "./prompts/teacher/session-planner";
import { TEACHER_EXPLAINER_SYSTEM, buildTeacherExplainerPrompt } from "./prompts/teacher/teacher-explainer";
import { learningActionSchema, learningSessionPlanSchema } from "@/lib/validation/curriculum-schemas";

const TEACHER_VERSION = "5.0.0";

function deterministicNextAction(state: LearnerState): LearningAction {
  // §21 priority = bottleneck severity × impact × ... — simplified deterministic ranking
  const sorted = [...state.skills].sort((a, b) => a.mastery - b.mastery);
  const weakest = sorted[0];
  const primaryGoal = state.goals.find((g) => g.isPrimary)?.id || "general";
  const goalSkills = getSkillsForGoal(primaryGoal);
  // User goal absolute: prefer goal skill even if not weakest
  const bottleneckSkill = state.weaknesses[0]?.skillId || weakest.skillId;
  const reconciled = reconcileGoalAndDiagnosis(primaryGoal, bottleneckSkill);
  const chosenSkill = reconciled.primarySkill;
  const masteryMap = new Map(state.skills.map((s) => [s.skillId, s.mastery]));
  const canDo = arePrerequisitesSatisfied(chosenSkill, masteryMap) ? chosenSkill : weakest.skillId;
  const skillState = state.skills.find((s) => s.skillId === canDo);
  const difficulty = skillState ? Math.max(1, Math.min(10, Math.round(skillState.currentDifficulty))) : 5;
  // Avoid repetition: if last session was same skill, pick supporting
  const lastSkill = state.practiceHistory.lastSessions.slice(-1)[0]?.skillId;
  let finalSkill = canDo;
  if (lastSkill === canDo && state.skills.length > 2) {
    // pick second weakest that satisfies prereqs
    const alt = sorted.find((s) => s.skillId !== canDo && arePrerequisitesSatisfied(s.skillId, masteryMap));
    if (alt) finalSkill = alt.skillId;
  }
  return {
    type: "foundation_exercise",
    skillId: finalSkill,
    reason: reconciled.reason,
    priority: "high",
    difficulty,
    durationMinutes: state.preferences.preferredSessionLength || 10,
    sourceEvidence: [reconciled.reason],
  };
}

export async function getNextBestAction(
  state: LearnerState,
  context?: { availableExerciseTypes?: string[]; durationMinutes?: number },
  opts?: { provider?: string; model?: string }
): Promise<LearningAction> {
  const fallback = deterministicNextAction(state);
  // Try AI refinement if provider available and not mock
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return fallback;
  try {
    const snapshot = getCompactSnapshot(state);
    const prompt = buildNextActionPrompt(JSON.stringify(snapshot), JSON.stringify(context?.availableExerciseTypes || ["rapid_response", "answer_expansion", "controlled_speaking", "conversation"]));
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: NEXT_ACTION_SYSTEM,
        temperature: 0.4,
        maxOutputTokens: 400,
      },
    });
    const t = res.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    let json: unknown = null;
    try { json = JSON.parse(t); } catch { const m = t.match(/\{[\s\S]*\}/); if (m) try { json = JSON.parse(m[0]); } catch {} }
    if (json) {
      const parsed = learningActionSchema.safeParse(json);
      if (parsed.success) {
        // Validate skill exists, difficulty bounds — policy validation
        if (parsed.data.skillId && !state.skills.some((s) => s.skillId === parsed.data.skillId)) {
          // fallback to deterministic skill
          parsed.data.skillId = fallback.skillId;
        }
        return parsed.data;
      }
    }
  } catch {}
  return fallback;
}

// Session builder §30
export async function buildLearningSession(
  state: LearnerState,
  duration: number,
  context?: { goalOverride?: string },
  opts?: { provider?: string; model?: string }
): Promise<LearningSessionPlan> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  const fallback = buildDeterministicPlan(state, duration);
  if (provider === "mock") return fallback;

  try {
    const snapshot = getCompactSnapshot(state);
    const prompt = buildSessionPlannerPrompt(JSON.stringify(snapshot), duration, JSON.stringify({ goalOverride: context?.goalOverride, availableBlocks: "warmup|drill|controlled_speaking|conversation|roleplay|review|challenge|cooldown" }));
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: SESSION_PLANNER_SYSTEM,
        temperature: 0.5,
        maxOutputTokens: 900,
      },
    });
    const t = res.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    let json: unknown = null;
    try { json = JSON.parse(t); } catch { const m = t.match(/\{[\s\S]*\}/); if (m) try { json = JSON.parse(m[0]); } catch {} }
    if (json) {
      const withDefaults = json as Record<string, unknown>;
      if (!withDefaults.id) withDefaults.id = `plan_${Date.now()}`;
      if (!withDefaults.planVersion) withDefaults.planVersion = 1;
      if (!withDefaults.generatedAt) withDefaults.generatedAt = new Date().toISOString();
      if (!withDefaults.teacherVersion) withDefaults.teacherVersion = TEACHER_VERSION;
      if (!withDefaults.schemaVersion) withDefaults.schemaVersion = 1;
      if (!withDefaults.generationReason) withDefaults.generationReason = "AI generated";
      const parsed = learningSessionPlanSchema.safeParse(withDefaults);
      if (parsed.success) {
        // Policy validation: duration sum
        const sum = parsed.data.blocks.reduce((s, b) => s + b.durationMinutes, 0);
        if (Math.abs(sum - duration) > 5) {
          // Adjust fallback
          return fallback;
        }
        // Validate exercise types exist
        return parsed.data;
      }
    }
  } catch {}
  return fallback;
}

function buildDeterministicPlan(state: LearnerState, duration: number): LearningSessionPlan {
  const weakest = [...state.skills].sort((a, b) => a.mastery - b.mastery)[0];
  const primarySkill = weakest?.skillId || "sentence_retrieval";
  const diff = weakest ? Math.round(weakest.currentDifficulty) : 5;
  // §24 distribution 60/20/10/10 but simplified for duration
  const blocks: LearningBlock[] = [];
  if (duration >= 10) {
    blocks.push({ id: "b1", type: "warmup", skillId: primarySkill, durationMinutes: 2, difficulty: Math.max(1, diff - 1), rationale: "Activate vocabulary" });
  }
  const drillMins = duration <= 5 ? duration - (blocks.length ? 2 : 0) : duration <= 10 ? 3 : 5;
  if (drillMins > 0) blocks.push({ id: "b2", type: "drill", skillId: primarySkill, exerciseType: "rapid_response", durationMinutes: drillMins, difficulty: diff, rationale: `Bottleneck work: ${primarySkill}` });
  if (duration > 8) {
    const supp = state.skills.find((s) => s.skillId !== primarySkill)?.skillId || "sentence_expansion";
    blocks.push({ id: "b3", type: "controlled_speaking", skillId: supp, durationMinutes: Math.min(3, duration - blocks.reduce((s, b) => s + b.durationMinutes, 0)), difficulty: diff, rationale: "Supporting skill" });
  }
  if (duration > 5 && blocks.reduce((s, b) => s + b.durationMinutes, 0) < duration) {
    const remaining = duration - blocks.reduce((s, b) => s + b.durationMinutes, 0);
    blocks.push({ id: `b${blocks.length + 1}`, type: "conversation", skillId: "free_conversation", durationMinutes: remaining, difficulty: diff, rationale: "Free speaking to transfer" });
  }
  // If duration very short, just one block
  if (blocks.length === 0) {
    blocks.push({ id: "b1", type: "drill", skillId: primarySkill, durationMinutes: duration, difficulty: diff, rationale: `Short session focus ${primarySkill}` });
  }
  return {
    id: `plan_${Date.now()}`,
    title: `Today's Focus: ${primarySkill}`,
    objective: `Improve ${primarySkill} through targeted practice`,
    estimatedDurationMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
    blocks,
    primarySkill,
    secondarySkills: blocks.slice(1).map((b) => b.skillId).filter(Boolean) as string[],
    expectedOutcome: `Better ${primarySkill} automaticity`,
    planVersion: 1,
    generatedAt: new Date().toISOString(),
    generationReason: "deterministic fallback",
    teacherVersion: TEACHER_VERSION,
    schemaVersion: 1,
  };
}

// Mid-session replan §92-93
export async function replanSession(
  currentPlan: LearningSessionPlan,
  livePerformance: { completedBlocks: Array<{ blockId: string; performance: number }>; remainingTime: number },
  state: LearnerState,
  opts?: { provider?: string; model?: string }
): Promise<LearningSessionPlan> {
  const avgPerf = livePerformance.completedBlocks.length ? livePerformance.completedBlocks.reduce((s, b) => s + b.performance, 0) / livePerformance.completedBlocks.length : 0.5;
  // Simple deterministic replan: if avgPerf >0.75 → increase difficulty / skip easy, if <0.4 → insert support
  const remainingBlocks = currentPlan.blocks.filter((b) => !livePerformance.completedBlocks.some((c) => c.blockId === b.id));
  let newBlocks = [...remainingBlocks];
  if (avgPerf > 0.75 && newBlocks.length > 1) {
    // skip easiest, increase difficulty
    newBlocks = newBlocks.slice(1).map((b) => ({ ...b, difficulty: Math.min(10, b.difficulty + 1) }));
  } else if (avgPerf < 0.4 && newBlocks.length > 0) {
    newBlocks.unshift({ id: `insert_${Date.now()}`, type: "drill", skillId: state.skills.sort((a, b) => a.mastery - b.mastery)[0].skillId, durationMinutes: 2, difficulty: Math.max(1, newBlocks[0].difficulty - 1), rationale: "Insert support due to struggle" });
  }
  // Trim to remaining time
  let sum = 0;
  const trimmed: LearningBlock[] = [];
  for (const b of newBlocks) {
    if (sum + b.durationMinutes <= livePerformance.remainingTime) {
      trimmed.push(b);
      sum += b.durationMinutes;
    } else if (sum < livePerformance.remainingTime) {
      trimmed.push({ ...b, durationMinutes: livePerformance.remainingTime - sum });
      break;
    }
  }
  return { ...currentPlan, blocks: [...currentPlan.blocks.filter((b) => livePerformance.completedBlocks.some((c) => c.blockId === b.id)), ...trimmed], generationReason: `replanned avgPerf ${avgPerf.toFixed(2)}` };
}

export async function explainPlan(plan: LearningSessionPlan, bottleneck: string, opts?: { provider?: string; model?: string }): Promise<string> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return `Tập trung vào ${bottleneck}. Kế hoạch ${plan.blocks.length} blocks giúp cải thiện dần.`;
  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: buildTeacherExplainerPrompt(JSON.stringify(plan), JSON.stringify({ bottleneck })) }],
        systemInstruction: TEACHER_EXPLAINER_SYSTEM,
        temperature: 0.5,
        maxOutputTokens: 300,
      },
    });
    const t = res.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    try {
      const j = JSON.parse(t) as { explanation?: string };
      if (j.explanation) return j.explanation;
    } catch {
      const m = t.match(/\{[\s\S]*\}/);
      if (m) try { const j = JSON.parse(m[0]) as { explanation?: string }; if (j.explanation) return j.explanation; } catch {}
      if (t.length > 10 && t.length < 500) return t;
    }
  } catch {}
  return `Tập trung vào ${plan.primarySkill || bottleneck}. Kế hoạch ${plan.estimatedDurationMinutes} phút giúp cải thiện automaticity.`;
}
