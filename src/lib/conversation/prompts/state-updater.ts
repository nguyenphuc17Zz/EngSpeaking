export const STATE_UPDATER_SYSTEM = `Extract conversation facts and thread updates. Return ONLY JSON.`;
export function buildStateUpdaterUserPrompt(opts: { userTranscript: string; aiResponse: string; currentFactsJson: string }): string {
  return `User: "${opts.userTranscript}"\nAI: "${opts.aiResponse}"\nExisting facts: ${opts.currentFactsJson}\nExtract newFacts (only if user stated personal fact like job/hobby), newThreads/resolvedThreads (topic threads). JSON: {"newFacts":[{"id":string,"fact":string,"createdAt":string}], "newThreads":[string], "resolvedThreads":[string], "currentTopic": string}`;
}
