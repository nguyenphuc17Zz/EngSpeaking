// UserAIProfile §45
export interface UserAIProfile {
  mode: "auto" | "manual";
  preferredProvider?: string;
  preferredModels?: Record<string, string>; // task -> modelId
  qualityPreference: "economy" | "balanced" | "quality";
  latencyPreference: "fast" | "balanced" | "quality";
  fallbackEnabled: boolean;
  contextOptimizationEnabled: boolean;
}

export const DEFAULT_AI_PROFILE: UserAIProfile = {
  mode: "auto",
  qualityPreference: "balanced",
  latencyPreference: "balanced",
  fallbackEnabled: false, // OFF by default §37
  contextOptimizationEnabled: true,
};
