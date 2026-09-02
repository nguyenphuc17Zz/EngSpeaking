import type { AdvancedTrainingModule, AdvancedTrainingType } from "@/types/advanced";

const registry = new Map<string, AdvancedTrainingModule>();

export function registerModule(mod: AdvancedTrainingModule) {
  registry.set(mod.type, mod);
}

export function getRegistry(): Map<string, AdvancedTrainingModule> {
  return registry;
}

export function listModuleTypes(): AdvancedTrainingType[] {
  return Array.from(registry.keys()) as AdvancedTrainingType[];
}

// Auto-register all modules lazily
let initialized = false;
export async function ensureRegistry(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const modules = [
    "rapidResponse","pressureConversation","topicSwitching","unexpectedQuestion","deepFollowup","opinion","debate","persuasion","negotiation","storytelling","longForm","presentation","qaChallenge","interview","professional","clarification","resilience","ambiguity","escalation","reformulation","spontaneous","abstract","roleReversal","devilsAdvocate","highPressure"
  ];
  for (const type of modules) {
    const mod: AdvancedTrainingModule = {
      id: type,
      type: type as AdvancedTrainingType,
      skillTargets: [type],
      difficultyDimensions: ["responsePressure","topicNovelty","abstractness","conversationComplexity"],
      generateSession: async (ctx) => {
        const { generateMockSession } = await import("./mock/mock-session");
        return generateMockSession(type as AdvancedTrainingType, ctx);
      },
    };
    registerModule(mod);
  }
}
