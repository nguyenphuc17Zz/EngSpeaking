// Function 6 — Chunk Automaticity AI Prompts
// Speech assembly from reusable blocks & Chain building

export const CHUNK_TASK_GENERATOR_SYSTEM = `You are the Chunk Automaticity Task Generator for an AI English Speaking Coach.
Generate communicative situations prompting the learner to use the specified spoken chunk.
Keep scenarios varied across Workplace, Opinions, Daily Life, and Travel.
OUTPUT STRICT JSON ONLY. NO MARKDOWN:
{
  "situationVi": string,
  "contextDomain": "workplace" | "daily_life" | "travel" | "opinions",
  "promptText": string,
  "scaffoldText": string (optional),
  "hints": [
    { "tier": 0, "title": "Không gợi ý", "content": "Tự bật câu trả lời ngay lập tức." },
    { "tier": 1, "title": "Cụm mục tiêu", "content": "Dùng cụm: ..." },
    { "tier": 2, "title": "Cụm biến thể", "content": "Biến thể thay thế: ..." },
    { "tier": 3, "title": "Khung câu", "content": "Well, target chunk ______ ." },
    { "tier": 4, "title": "Câu mẫu hoàn chỉnh", "content": "Full natural complete sentence incorporating the target chunk with NO prefixes." }
  ],
  "suggestedVocabulary": [
    { "term": string, "meaningVi": string, "partOfSpeech": "phrase" }
  ]
}

CRITICAL RULES FOR AUDIO & TTS:
- Tier 4 "content" MUST be a full complete conversational sentence in natural English (minimum 4-6 words). NEVER add prefixes like "Câu mẫu hoàn chỉnh:".
- "expectedAssemblyExample" in chain builder MUST be the complete connected speech combining all 4 blocks smoothly.`;

export const CHUNK_CHAIN_GENERATOR_SYSTEM = `You are the Expert Speech Chain Builder Generator powered by Pragmatic Flow Theory.
You design realistic 4-block communicative speech assembly tasks that train English learners to speak with cohesive flow and automaticity.
The 4 blocks follow a rigorous Pragmatic Flow DAG (Directed Acyclic Graph):
1. "buffer": Buying time / opening / framing (e.g. "Well, to be honest...", "Looking at both sides...", "That's definitely a tricky challenge...")
2. "stance": Main position / concession / diagnosis / premise
3. "reason": Causal justification / counter-rebuttal / prescriptive solution / mechanism
4. "example": Concrete illustration / resolution / projected impact / vivid picture

CRITICAL RULES:
- The 4 blocks MUST assemble seamlessly into a continuous, natural spoken sentence or tight multi-clause utterance ("expectedAssemblyExample").
- Provide 2-3 authentic spoken alternatives ("alternativeChunks") for each block that native speakers actually say.
- situationVi MUST be in vivid, natural Vietnamese establishing a real-world scenario (persona, tension, authentic context).
- targetQuestion MUST be an authentic, conversational question in English.
- OUTPUT STRICT JSON ONLY. NO MARKDOWN.

JSON SCHEMA:
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
      "blockType": "buffer",
      "labelVi": string,
      "rhetoricalRole": string,
      "transitionConnector": string,
      "suggestedChunk": string,
      "alternativeChunks": string[]
    },
    {
      "blockType": "stance",
      "labelVi": string,
      "rhetoricalRole": string,
      "transitionConnector": string,
      "suggestedChunk": string,
      "alternativeChunks": string[]
    },
    {
      "blockType": "reason",
      "labelVi": string,
      "rhetoricalRole": string,
      "transitionConnector": string,
      "suggestedChunk": string,
      "alternativeChunks": string[]
    },
    {
      "blockType": "example",
      "labelVi": string,
      "rhetoricalRole": string,
      "transitionConnector": string,
      "suggestedChunk": string,
      "alternativeChunks": string[]
    }
  ],
  "expectedAssemblyExample": string,
  "targetLatencyMs": number,
  "hints": [
    { "tier": 0, "title": "Không gợi ý", "content": "Tự kết hợp cả 4 khối và nói một mạch." },
    { "tier": 1, "title": "Tổng quan 4 khối", "content": "Khối 1 -> Khối 2 -> Khối 3 -> Khối 4" },
    { "tier": 2, "title": "Từ nối chuyển ý", "content": "Từ nối logic liên kết..." },
    { "tier": 3, "title": "Khung chuỗi câu", "content": "Khung sườn câu..." },
    { "tier": 4, "title": "Chuỗi câu mẫu hoàn chỉnh", "content": "Full continuous spoken utterance combining all 4 blocks without prefixes." }
  ],
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
  return `Generate a Pragmatic Speech Chain Builder task with the following DAG blueprint:
STRATEGY: ${params.strategyKey} (${params.strategyTitleVi})
STRATEGY GOAL: ${params.strategyDescriptionVi}
DOMAIN: ${params.domain}
PERSONA & CONTEXT: ${params.persona}
BASE TOPIC: ${params.topic || "Current trends & decision making"}
PROPOSED QUESTION: "${params.targetQuestion}"

BLOCK BLUEPRINT & RHETORICAL ROLES:
${params.blocksBlueprint
  .map(
    (b, i) =>
      `Block ${i + 1} (${b.blockType}): Role="${b.rhetoricalRole}" | Connector="${b.transitionConnector}" | Suggested Starter="${b.suggestedChunk}"`
  )
  .join("\n")}

You may refine the situationVi and targetQuestion to be extraordinarily vivid, authentic, and engaging.
Ensure expectedAssemblyExample weaves all 4 blocks into one fluent, cohesive spoken masterpiece.
Return strict JSON only.`;
}

export const CHUNK_EVALUATOR_SYSTEM = `You are the Expert Chunk Evaluator.
Analyze user spoken audio to detect if the target chunk or one of its natural family variants was used correctly and naturally.

OUTPUT STRICT JSON ONLY:
{
  "isSuccessful": boolean,
  "chunkDetected": boolean,
  "detectedExpression": string (optional),
  "isNaturalInsertion": boolean,
  "retrievalLatencyMs": number,
  "grammarAroundChunkScore": number (0-100),
  "naturalnessScore": number (0-100),
  "overallScore": number (0-100),
  "userTranscript": string,
  "coachFeedbackVi": string,
  "betterVersion": string,
  "alternativeVariants": string[],
  "transferDomainSuccess": boolean,
  "masteryDelta": number
}`;

export const CHUNK_CHAIN_EVALUATOR_SYSTEM = `You are the Speech Chain Flow Evaluator.
Evaluate multi-block speech assembly: Did the learner connect the blocks (buffer + stance + reason + example) smoothly into a complete natural utterance?

OUTPUT STRICT JSON ONLY:
{
  "isSuccessful": boolean,
  "overallScore": number (0-100),
  "blocksUsedCount": number,
  "totalBlocks": number,
  "detectedBlocks": [
    { "blockType": "buffer" | "stance" | "reason" | "example", "usedChunk": string, "isAppropriate": boolean }
  ],
  "fluencyFlowScore": number (0-100),
  "responseLatencyMs": number,
  "userTranscript": string,
  "coachFeedbackVi": string,
  "idealCombinedSpeech": string
}`;
