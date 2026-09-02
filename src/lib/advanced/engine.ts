// Advanced engine — common interface §4
import type { AdvancedTrainingContext, AdvancedTrainingSession, AdvancedTrainingModule } from "@/types/advanced";
import { getRegistry } from "./registry";

export class AdvancedEngine {
  async build(context: AdvancedTrainingContext): Promise<AdvancedTrainingSession> {
    // AI decides composition via prompt, but deterministic fallback
    const { buildAdvancedSession } = await import("./session-builder");
    return buildAdvancedSession(context);
  }

  getModule(type: string): AdvancedTrainingModule | undefined {
    return getRegistry().get(type);
  }

  listModules(): AdvancedTrainingModule[] {
    return Array.from(getRegistry().values());
  }
}
