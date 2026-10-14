// Function 6 — Chunk Automaticity AI Prompts
// Speech assembly from reusable blocks & Chain building

import { buildCreativeAngleDirective } from "./diversity-engine";

export const CHUNK_TASK_GENERATOR_SYSTEM = `You are the Chunk Automaticity Task Generator for an AI English Speaking Coach.
Generate vivid, non-cliché communicative situations prompting the learner to use the specified spoken chunk naturally.
Do NOT output "hints" array — the server synthesizes 5-tier hints automatically from "modelSentence".
OUTPUT STRICT JSON ONLY. NO MARKDOWN:
{
  "situationVi": string,
  "contextDomain": "workplace" | "daily_life" | "travel" | "opinions",
  "promptText": string,
  "scaffoldText": string (optional skeleton with '______'),
  "modelSentence": string (full natural English sentence >=6 words incorporating the target chunk, NO prefixes),
  "suggestedVocabulary": [
    { "term": string, "meaningVi": string, "partOfSpeech": "phrase" }
  ]
}`;

export const CHUNK_CHAIN_GENERATOR_SYSTEM = `You are the Expert Speech Chain Builder Generator powered by Pragmatic Flow Theory.
Design realistic 4-block communicative speech assembly tasks ("buffer" -> "stance" -> "reason" -> "example") that train English learners to speak with cohesive flow.

RULES:
1. The 4 blocks MUST assemble seamlessly into a continuous spoken utterance ("expectedAssemblyExample", no prefixes).
2. Provide 2-3 authentic spoken alternatives ("alternativeChunks") for each block.
3. situationVi: vivid Vietnamese establishing a specific real-world scenario (persona, tension, stakes).
4. Do NOT output "hints" array — the server synthesizes 5-tier hints automatically.
5. OUTPUT STRICT JSON ONLY. NO MARKDOWN:
{
  "id": string,
  "topic": string,
  "pragmaticStrategy": "opinion_defense" | "concession_counter" | "problem_solution" | "hypothetical_projection" | "cause_effect_chain",
  "strategyTitleVi": string,
  "strategyDescriptionVi": string,
  "persona": string,
  "domain": "workplace" | "daily_life" | "travel" | "tech_ai" | "opinions" | "career",
  "situationVi": string,
  "targetQuestion": string,
  "blocks": [
    {
      "blockType": "buffer" | "stance" | "reason" | "example",
      "labelVi": string,
      "rhetoricalRole": string,
      "transitionConnector": string,
      "suggestedChunk": string,
      "alternativeChunks": [string, string]
    }
  ],
  "expectedAssemblyExample": string,
  "targetLatencyMs": number,
  "suggestedVocabulary": [
    { "term": string, "meaningVi": string, "partOfSpeech": "connector" | "phrase" }
  ]
}`;

export function buildPragmaticChainUserPrompt(params: {
  topic?: string;
  strategyTitleVi: string;
  strategyKey: string;
  strategyDescriptionVi: string;
  domain: string;
  persona: string;
  situationVi: string;
  targetQuestion: string;
  blocksBlueprint: Array<{
    blockType: string;
    labelVi: string;
    rhetoricalRole: string;
    transitionConnector: string;
    suggestedChunk: string;
    alternativeChunks: string[];
  }>;
}): string {
  const creativeAngle = buildCreativeAngleDirective();
  return `Generate a 4-block Pragmatic Speech Chain task:
- Strategy: ${params.strategyKey} (${params.strategyTitleVi}) — ${params.strategyDescriptionVi}
- Domain: ${params.domain} | Base Topic: ${params.topic || "Current trends & decision making"}
- Seed Persona: ${params.persona}
- ${creativeAngle}
- Blueprint Blocks:
${params.blocksBlueprint
  .map(
    (b, i) =>
      `  ${i + 1}. ${b.blockType}: role="${b.rhetoricalRole}", connector="${b.transitionConnector}", starter="${b.suggestedChunk}"`
  )
  .join("\n")}

Craft a fresh, high-specificity situationVi and targetQuestion, and weave all 4 blocks into expectedAssemblyExample. Return JSON only.`;
}

export const CHUNK_EVALUATOR_SYSTEM = `You are the Expert Chunk Evaluator.
Analyze the learner's spoken transcript to check if the target chunk or one of its natural variants was used accurately and naturally.
Output STRICT JSON ONLY:
{
  "isSuccessful": boolean,
  "chunkDetected": boolean,
  "detectedExpression": string,
  "isNaturalInsertion": boolean,
  "grammarAroundChunkScore": number (0-100),
  "naturalnessScore": number (0-100),
  "overallScore": number (0-100),
  "coachFeedbackVi": string,
  "betterVersion": string,
  "transferDomainSuccess": boolean,
  "masteryDelta": number
}`;

export const CHUNK_CHAIN_EVALUATOR_SYSTEM = `You are the Speech Chain Flow Evaluator.
Evaluate multi-block speech assembly: Did the learner connect the 4 blocks (buffer + stance + reason + example) smoothly into a cohesive spoken utterance?
Output STRICT JSON ONLY:
{
  "isSuccessful": boolean,
  "overallScore": number (0-100),
  "blocksUsedCount": number,
  "detectedBlocks": [
    { "blockType": "buffer" | "stance" | "reason" | "example", "usedChunk": string, "isAppropriate": boolean }
  ],
  "fluencyFlowScore": number (0-100),
  "coachFeedbackVi": string,
  "idealCombinedSpeech": string
}`;

