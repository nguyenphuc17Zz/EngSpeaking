// Prompt registry §20-23 — centralized, versioned
export interface PromptMeta {
  name: string;
  version: string;
  task: string;
  template: string;
  variables: string[];
  outputSchema?: unknown;
}

const REGISTRY = new Map<string, PromptMeta>();

export function registerPrompt(meta: PromptMeta) {
  REGISTRY.set(`${meta.name}@${meta.version}`, meta);
}

export function getPrompt(name: string, version?: string): PromptMeta | undefined {
  if (version) return REGISTRY.get(`${name}@${version}`);
  // Latest version by name
  const candidates = Array.from(REGISTRY.values()).filter((p) => p.name === name).sort((a, b) => b.version.localeCompare(a.version));
  return candidates[0];
}

export function composePrompt(baseSystem: string, taskInstructions: string, context: string, userInput: string, outputReq: string): string {
  // Layers §22: Base + Task + Context + User input + Output requirements
  return [baseSystem, taskInstructions, context ? `Context:\n${context}` : "", `User input:\n${userInput}`, outputReq ? `Output requirements:\n${outputReq}` : ""].filter(Boolean).join("\n\n");
}

// Register core prompts on init
registerPrompt({ name: "conversation_response", version: "1.0.0", task: "conversation_response", template: "RESPONSE_SYSTEM", variables: ["worldState", "recentTurns"], outputSchema: { type: "object" } });
registerPrompt({ name: "scenario_generation", version: "1.0.0", task: "scenario_generation", template: "SCENARIO_SYSTEM", variables: ["mode", "difficulty"], outputSchema: {} });
