// Universal Content Banking & Hybrid 70/30 Engine
// Caches AI-generated tasks in DB/memory with SHA-256 deduplication and anti-repetition tracking

import crypto from "crypto";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface ContentBankRecord {
  id: string;
  module: string;
  category: string;
  level: string;
  difficulty: number;
  topic: string;
  content_hash: string;
  payload: unknown;
  quality_score: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserContentExposure {
  id: string;
  user_id: string;
  content_id: string;
  module: string;
  exposed_at: string;
  score?: number;
  completed: boolean;
}

export interface SampleBankOptions {
  module: string;
  difficulty?: number;
  level?: string;
  topic?: string;
  category?: string;
  userId?: string;
  maxAgeDays?: number; // Exclude tasks seen in this window (default: 14 days)
  bankRatio?: number; // Default 0.7 (70% DB pool, 30% dynamic AI)
  forceSource?: "bank" | "ai" | "auto";
}

export interface SampleBankResult<T> {
  task: T;
  contentId: string;
  source: "bank";
  usageCount: number;
}

export interface SaveBankTaskInput {
  module: string;
  category?: string;
  level?: string;
  difficulty?: number;
  topic?: string;
  payload: unknown;
  hashSourceText: string;
  qualityScore?: number;
}

// Compute normalized SHA-256 hash for deduplication
export function computeContentHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// Global In-Memory fallbacks for server-side persistence when Supabase is not connected
declare global {
  // eslint-disable-next-line no-var
  var __CONTENT_BANK_STORE__: Map<string, ContentBankRecord> | undefined;
  // eslint-disable-next-line no-var
  var __USER_EXPOSURES_STORE__: UserContentExposure[] | undefined;
}

function getMemoryBankStore(): Map<string, ContentBankRecord> {
  if (!globalThis.__CONTENT_BANK_STORE__) {
    globalThis.__CONTENT_BANK_STORE__ = new Map();
    seedInitialMemoryBank(globalThis.__CONTENT_BANK_STORE__);
  }
  return globalThis.__CONTENT_BANK_STORE__;
}

function getMemoryExposuresStore(): UserContentExposure[] {
  if (!globalThis.__USER_EXPOSURES_STORE__) {
    globalThis.__USER_EXPOSURES_STORE__ = [];
  }
  return globalThis.__USER_EXPOSURES_STORE__;
}

/**
 * Pre-seeds high-frequency starter tasks so the Content Bank is never empty on cold start.
 */
function seedInitialMemoryBank(store: Map<string, ContentBankRecord>): void {
  const seeds: SaveBankTaskInput[] = [
    // 1. Sentence Builder Seeds
    {
      module: "sentence_builder",
      category: "daily_life",
      level: "controlled",
      difficulty: 3,
      topic: "daily_routine",
      hashSourceText: "Tôi thường uống cà phê vào mỗi buổi sáng.",
      payload: {
        id: "sb_seed_coffee_morning",
        taskType: "sentence_completion",
        controlLevel: "controlled",
        instruction: "Hoàn thành câu sau bằng tiếng Anh:",
        promptVi: "Tôi thường uống cà phê vào mỗi buổi sáng.",
        targetIntent: "I usually drink coffee every morning.",
        expectedResponses: [
          "I usually drink coffee every morning.",
          "I normally drink a cup of coffee each morning.",
        ],
        requiredElements: ["usually", "drink coffee", "every morning"],
        scaffold: {
          level: 1,
          template: "I usually ___ every morning.",
          keywords: ["coffee", "drink"],
          starter: "I usually...",
          constraints: [],
        },
        hints: [
          { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
          { tier: 1, title: "Từ khoá", content: "drink coffee", penaltyWeight: 0.1 },
          { tier: 2, title: "Khung câu", content: "I usually ___ every morning.", penaltyWeight: 0.25 },
          { tier: 3, title: "Từ mở đầu", content: "I usually...", penaltyWeight: 0.5 },
          { tier: 4, title: "Câu mẫu", content: "I usually drink coffee every morning.", penaltyWeight: 0.85 },
        ],
        suggestedVocabulary: [
          { term: "usually", phonetic: "/ˈjuː.ʒu.ə.li/", meaningVi: "thường xuyên" },
          { term: "coffee", phonetic: "/ˈkɒf.i/", meaningVi: "cà phê" },
        ],
        difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.5, lengthScore: 2 },
        skills: ["sentence_construction"],
        grammarTargets: ["present_simple"],
        topic: "daily_life",
        prepTimeSec: 3.0,
      },
    },
    {
      module: "sentence_builder",
      category: "workplace",
      level: "semi_controlled",
      difficulty: 5,
      topic: "work_discussion",
      hashSourceText: "Nếu chúng ta nộp báo cáo muộn, khách hàng sẽ không hài lòng.",
      payload: {
        id: "sb_seed_report_deadline",
        taskType: "conditional_sentence",
        controlLevel: "semi_controlled",
        instruction: "Nói câu điều kiện sau sang tiếng Anh:",
        promptVi: "Nếu chúng ta nộp báo cáo muộn, khách hàng sẽ không hài lòng.",
        targetIntent: "If we submit the report late, the client will be unhappy.",
        expectedResponses: [
          "If we submit the report late, the client will be unhappy.",
          "If we hand in the report late, the client will not be pleased.",
        ],
        requiredElements: ["if we submit", "report late", "client will be unhappy"],
        scaffold: {
          level: 2,
          template: "If we ___ the report late, the client will ___ .",
          keywords: ["submit", "unhappy"],
          starter: "If we submit...",
          constraints: [],
        },
        hints: [
          { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
          { tier: 1, title: "Từ khoá", content: "submit / late / client / unhappy", penaltyWeight: 0.1 },
          { tier: 2, title: "Khung câu", content: "If we [verb] late, the client will [verb/adj].", penaltyWeight: 0.25 },
          { tier: 3, title: "Từ mở đầu", content: "If we submit the report...", penaltyWeight: 0.5 },
          { tier: 4, title: "Câu mẫu", content: "If we submit the report late, the client will be unhappy.", penaltyWeight: 0.85 },
        ],
        suggestedVocabulary: [
          { term: "submit", phonetic: "/səbˈmɪt/", meaningVi: "nộp, gửi đi" },
          { term: "client", phonetic: "/ˈklaɪ.ənt/", meaningVi: "khách hàng" },
        ],
        difficulty: { overall: 5, grammarComplexity: 4, retrievalDemand: 0.6, lengthScore: 3 },
        skills: ["conditionals"],
        grammarTargets: ["first_conditional"],
        topic: "workplace",
        prepTimeSec: 4.0,
      },
    },

    // 2. VN -> EN Seeds
    {
      module: "vn_to_en",
      category: "daily_life",
      level: "direct",
      difficulty: 3,
      topic: "daily_routine",
      hashSourceText: "Tôi thường uống một tách cà phê vào buổi sáng trước khi bắt đầu làm việc.",
      payload: {
        id: "vn_seed_coffee_routine",
        category: "daily_life",
        retrievalMode: "direct",
        promptVi: "Tôi thường uống một tách cà phê vào buổi sáng trước khi bắt đầu làm việc.",
        targetIntent: "I usually drink a cup of coffee in the morning before starting work.",
        expectedResponses: [
          "I usually drink a cup of coffee in the morning before I start work.",
          "I normally have a cup of coffee in the morning before work.",
          "I usually grab a cup of coffee in the morning before starting my work.",
        ],
        requiredMeaningElements: ["usually drink coffee", "in the morning", "before starting work"],
        targetSkills: ["present_simple", "daily_routine", "spoken_retrieval"],
        difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, semanticDensity: 2 },
        hints: [
          { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
          { tier: 1, title: "Từ khoá chính", content: "cup of coffee / morning / start work", penaltyWeight: 0.1 },
          { tier: 2, title: "Cấu trúc gợi ý", content: "Dùng thì Hiện tại đơn: I usually [verb] before I [verb].", penaltyWeight: 0.25 },
          { tier: 3, title: "Từ mở đầu", content: "I usually drink a cup of coffee...", penaltyWeight: 0.5 },
          { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "I usually drink a cup of coffee in the morning before I start work.", penaltyWeight: 0.9 },
        ],
        prepTimeSec: 2.5,
        isRapidFire: false,
        topic: "daily_routine",
        suggestedVocabulary: [{ term: "drink coffee", meaningVi: "uống cà phê" }],
        sayItBetter: {
          professional: "I typically drink a cup of coffee in the morning prior to commencing work.",
          casual: "I usually grab a cup of coffee in the morning before starting work.",
          idiomatic: "I always kick off my morning with a nice cup of joe before getting down to work.",
        },
      },
    },

    // 3. Response Latency Seeds
    {
      module: "latency",
      category: "daily_conversation",
      level: "open_response",
      difficulty: 3,
      topic: "relaxation",
      hashSourceText: "What do you usually do to relax after a long day at work?",
      payload: {
        id: "lat_seed_relax_after_work",
        drillMode: "open_response",
        promptText: "What do you usually do to relax after a long day at work?",
        promptLanguage: "en",
        targetIntent: "Talking about relaxation activities after work",
        expectedKeywords: ["usually", "relax", "music", "read"],
        sampleResponses: ["I usually listen to music or read a book to unwind."],
        targetLatencyMs: 3000,
        difficulty: 3,
        category: "daily_conversation",
        bufferPhraseSuggestion: "That's a good question. I usually...",
        bufferChunks: [
          { phrase: "Well, to be honest...", meaningVi: "Thành thật mà nói...", category: "buying_time" },
          { phrase: "From my perspective...", meaningVi: "Theo góc nhìn của tôi...", category: "framing_opinion" },
          { phrase: "Off the top of my head...", meaningVi: "Nghĩ ngay lúc này thì...", category: "immediate_reaction" },
        ],
        staircaseTargetMs: 3000,
        hints: [
          { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay lập tức." },
          { tier: 1, title: "Từ khoá cốt lõi", content: "usually / relax / music" },
          { tier: 2, title: "Cụm từ đệm mở đầu", content: "That's a good question. I usually..." },
          { tier: 3, title: "Khung câu", content: "That's a good question. I usually ______ to relax." },
          { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "I usually listen to music or read a book to unwind." },
        ],
        suggestedVocabulary: [
          { term: "unwind", meaningVi: "thư giãn, xả hơi", partOfSpeech: "verb" },
        ],
      },
    },

    // 4. Conversation Scenario Seeds (Phase 2)
    {
      module: "conversation_scenario",
      category: "workplace",
      level: "workplace",
      difficulty: 5,
      topic: "project_deadline",
      hashSourceText: "office meeting room|manager|project update|Give a progress update|",
      payload: {
        id: "sc_seed_workplace_deadline",
        schemaVersion: 1,
        mode: "workplace",
        topic: "project update",
        setting: "office meeting room",
        character: {
          role: "manager",
          personality: "direct but supportive",
          communicationStyle: "professional, clear",
          initialPatience: 75,
          initialTrust: 60,
        },
        userGoal: "Give a progress update and negotiate timeline",
        aiGoal: "Ask clarifying questions about blockers and next steps",
        context: "Weekly team sync, you need to report progress and raise any blockers",
        difficulty: 5,
        targetExchanges: 6,
        possibleEvents: [
          {
            id: "ev_urgent_requirement",
            type: "new_information",
            effect: "Client just requested an additional feature before release",
            probability: 0.4,
            priority: 1,
          },
        ],
      },
    },
    {
      module: "conversation_scenario",
      category: "interview",
      level: "interview",
      difficulty: 6,
      topic: "job_interview",
      hashSourceText: "interview room|interviewer|tell me about yourself|Answer interview questions|",
      payload: {
        id: "sc_seed_job_interview",
        schemaVersion: 1,
        mode: "interview",
        topic: "tell me about yourself",
        setting: "interview room",
        character: {
          role: "interviewer",
          personality: "neutral, probing",
          communicationStyle: "professional, follow-up oriented",
          initialPatience: 70,
          initialTrust: 50,
        },
        userGoal: "Highlight your key strengths and experience concisely",
        aiGoal: "Probe for specific achievements and handling of difficult situations",
        context: "First round job interview for your desired position",
        difficulty: 6,
        targetExchanges: 6,
        possibleEvents: [],
      },
    },

    // 5. Survival Circumlocution Seeds (Phase 2)
    {
      module: "survival_circumlocution",
      category: "Household & Appliances",
      level: "easy",
      difficulty: 3,
      topic: "kitchen_appliance",
      hashSourceText: "microwave",
      payload: {
        id: "circ_seed_microwave",
        targetWord: "microwave",
        forbiddenWords: ["microwave", "micro"],
        tabooLemmas: ["microwave", "microwaves", "microwaving", "microwaved"],
        vietnameseMeaning: "Lò vi sóng",
        category: "Đồ gia dụng (Kitchen Appliance)",
        genus: "a kitchen appliance",
        differentia: "heats up food and drinks quickly using electromagnetic waves",
        semanticKeyAnchors: ["heat", "food", "kitchen", "quick", "warm"],
        difficulty: "easy",
        timeLimitSeconds: 5,
        hints: {
          functionHint: "Dùng để hâm nóng thức ăn cực nhanh bằng sóng",
          categoryHint: "Một thiết bị điện tử trong nhà bếp",
          contextHint: "Thường đặt trên kệ bếp trong nhà hoặc văn phòng",
          starterHint: "It's a kitchen machine that you use to heat up food quickly.",
        },
        tierHints: [
          { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây mà không dùng từ cấm." },
          { tier: 1, title: "Chức năng", content: "Dùng để hâm nóng thức ăn cực nhanh bằng sóng vi ba." },
          { tier: 2, title: "Chủng loại", content: "Một thiết bị gia dụng nhà bếp (kitchen appliance)." },
          { tier: 3, title: "Khung câu", content: "It's a kind of electrical appliance in the kitchen that you use to ______ ." },
          { tier: 4, title: "Câu mẫu", content: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes." },
        ],
        sampleExplanations: [
          "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
        ],
        suggestedVocabulary: [
          { term: "a kind of appliance", meaningVi: "một loại thiết bị gia dụng", partOfSpeech: "phrase" },
        ],
      },
    },

    // 6. Chunk Automaticity Seeds (Phase 2)
    {
      module: "chunk_chain",
      category: "opinions",
      level: "opinion_defense",
      difficulty: 4,
      topic: "remote_work",
      hashSourceText: "remote_work_opinion_defense",
      payload: {
        id: "chain_seed_remote_work",
        topic: "Remote work vs Office work",
        pragmaticStrategy: "opinion_defense",
        strategyTitleVi: "Bảo vệ quan điểm có cấu trúc",
        strategyDescriptionVi: "Đệm câu giờ → Nêu lập trường → Đưa lý do cốt lõi → Minh hoạ bằng ví dụ cụ thể",
        persona: "Chuyên gia phát triển phần mềm",
        domain: "workplace",
        situationVi: "Đồng nghiệp hỏi bạn lý do tại sao bạn thích làm việc từ xa hơn làm việc tại văn phòng.",
        targetQuestion: "Why do you prefer working remotely rather than going to the office every day?",
        blocks: [
          {
            blockType: "discourse_marker",
            labelVi: "Khối Đệm",
            suggestedChunk: "Well, to be honest,",
            alternativeChunks: ["As far as I'm concerned,", "From my point of view,"],
            rhetoricalRole: "Tạo khoảng nghỉ 1-2 giây để kích hoạt phản xạ",
            transitionConnector: "I personally feel that",
          },
          {
            blockType: "stance_statement",
            labelVi: "Khối Quan Điểm",
            suggestedChunk: "I strongly believe that remote work enhances productivity,",
            alternativeChunks: ["I'm convinced that remote flexibility is essential,"],
            rhetoricalRole: "Khẳng định lập trường rõ ràng",
            transitionConnector: "mainly because",
          },
          {
            blockType: "reason_justification",
            labelVi: "Khối Lý Do",
            suggestedChunk: "it eliminates daily commute stress and allows deeper focus,",
            alternativeChunks: ["it gives people autonomy over their optimal working hours,"],
            rhetoricalRole: "Cung cấp căn cứ thuyết phục",
            transitionConnector: "For example,",
          },
          {
            blockType: "grounding_example",
            labelVi: "Khối Ví Dụ",
            suggestedChunk: "in my personal routine, I save two hours each day for focused coding.",
            alternativeChunks: ["I can deliver complex features much faster without constant office noise."],
            rhetoricalRole: "Neo lập luận vào trải nghiệm thực tế",
            transitionConnector: "",
          },
        ],
        expectedAssemblyExample: "Well, to be honest, I personally feel that remote work enhances productivity, mainly because it eliminates daily commute stress and allows deeper focus. For example, in my personal routine, I save two hours each day for focused coding.",
        targetLatencyMs: 3000,
        hints: [
          { tier: 0, title: "Không gợi ý", content: "Nói trôi chảy 4 khối liên tục." },
          { tier: 1, title: "Cấu trúc", content: "Đệm → Quan điểm → Lý do → Ví dụ" },
          { tier: 2, title: "Từ nối", content: "Well, to be honest → I believe that → because → For instance" },
          { tier: 3, title: "Khung câu", content: "Well, to be honest, I personally feel that ______ mainly because ______ . For example, ______ ." },
          { tier: 4, title: "Câu mẫu", content: "Well, to be honest, I personally feel that remote work enhances productivity, mainly because it eliminates commute stress. For example, I save two hours daily." },
        ],
      },
    },

    // 7. Vocabulary Deep Enrichment Seeds (Phase 2)
    {
      module: "vocabulary_word",
      category: "business_adjective",
      level: "B2",
      difficulty: 4,
      topic: "resilient",
      hashSourceText: "resilient",
      payload: {
        id: "word_seed_resilient",
        word: "resilient",
        ipaUS: "/rɪˈzɪl.jənt/",
        ipaUK: "/rɪˈzɪl.jənt/",
        partOfSpeech: "adjective",
        meaningVi: "kiên cường, có khả năng phục hồi nhanh chóng sau khó khăn",
        definitionEn: "able to be happy, successful, etc. again after something difficult or bad has happened",
        cefrLevel: "B2",
        collocations: [
          { phrase: "highly resilient", meaningVi: "cực kỳ kiên cường", exampleSentence: "Our engineering team proved to be highly resilient during the outage." },
          { phrase: "resilient economy", meaningVi: "nền kinh tế phục hồi tốt", exampleSentence: "A resilient economy adapts well to market fluctuations." },
        ],
        contextSentences: [
          {
            id: "s1",
            domain: "workplace",
            domainTitleVi: "Công việc (Workplace)",
            sentenceEn: "She is remarkably resilient in the face of setbacks.",
            sentenceVi: "Cô ấy kiên cường một cách đáng nể trước những trắc trở.",
            targetWordHighlighted: "resilient",
          },
        ],
        spontaneousChallenge: {
          promptEn: "Talk about a time you or someone you know remained resilient during a challenge.",
          promptVi: "Kể về một lần bạn hoặc ai đó đã kiên cường vượt qua khó khăn.",
          targetCollocation: "remain resilient",
        },
      },
    },

    // 8. Retry-Loop Repair Challenge Seeds (Phase 3)
    {
      module: "retry_loop_repair",
      category: "grammar",
      level: "A2",
      difficulty: 3,
      topic: "past_simple",
      hashSourceText: "Yesterday I went to work late because of a traffic jam",
      payload: {
        id: "repair_seed_past_simple",
        category: "grammar",
        situationVi: "Bạn đang chia sẻ về lịch trình ngày hôm qua với đồng nghiệp",
        targetIntent: "Hôm qua tôi đã đi làm muộn vì kẹt xe.",
        erroneousSentence: "Yesterday I go to work late because traffic jam.",
        userErroneousText: "go to work late because traffic jam",
        whatToFix: "Thì Quá khứ đơn & Cụm giới từ 'because of'",
        explanationVi: "Động từ 'go' cần chuyển sang quá khứ 'went', và dùng 'because of' trước cụm danh từ kẹt xe.",
        betterSentence: "Yesterday, I went to work late because of a traffic jam.",
        skeletonHint: "Yesterday, I ______ to work late because of a traffic jam.",
        simplifiedSentence: "Yesterday, I went to work late.",
        conversationalTrap: {
          partnerUtterance: "Wait, did you say you go yesterday or you went to work?",
          reactionPromptVi: "Đồng nghiệp đang hỏi lại xem bạn đi làm hôm qua hay hôm nay. Hãy đính chính lại bằng tiếng Anh!",
          suggestedStarter: "Oh sorry, I meant I went...",
        },
        hints: [
          { tier: 0, title: "Không gợi ý", content: "Tự phát hiện và sửa lại ngay." },
          { tier: 1, title: "Chỉ điểm lỗi", content: "Từ 'go' chưa chia quá khứ cho 'Yesterday', và thiếu 'of' sau 'because'." },
          { tier: 2, title: "Gợi ý cấu trúc", content: "Quá khứ: S + V2 (go -> went). Nguyên nhân: because of + Noun phrase." },
          { tier: 3, title: "Khung câu", content: "Yesterday, I ______ to work late because of a traffic jam." },
          { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "Yesterday, I went to work late because of a traffic jam." },
        ],
        suggestedVocabulary: ["traffic jam", "went to work"],
      },
    },

    // 9. Cognitive Simplification Seeds (Phase 3)
    {
      module: "retry_loop_simplification",
      category: "core_grammar",
      level: "A2",
      difficulty: 2,
      topic: "simplification",
      hashSourceText: "Yesterday I went to work late because of a traffic jam and missed the meeting",
      payload: {
        simplifiedPromptVi: "Hôm qua tôi đi làm muộn vì kẹt xe.",
        simplifiedEnglish: "Yesterday, I went to work late because of a traffic jam.",
        explanationVi: "Đã tách bỏ vế phụ để bạn tập trung luyện đúng cấu trúc quá khứ và cụm 'because of'.",
        reductionReason: "Giảm tải nhận thức (Cognitive Load Reduction)",
      },
    },

    // 10. Foundation Exercise Seeds (Phase 3)
    {
      module: "foundation_exercise",
      category: "one_sentence",
      level: "3",
      difficulty: 3,
      topic: "daily_routine",
      hashSourceText: "What do you usually eat for breakfast and why?",
      payload: {
        id: "ex_seed_one_sentence_breakfast",
        skill: "sentence_retrieval",
        type: "one_sentence",
        level: 3,
        difficulty: 3,
        instruction: "Trả lời câu hỏi sau bằng một câu hoàn chỉnh:",
        prompt: "What do you usually eat for breakfast and why?",
        expectedDurationSec: 15,
        hintPolicy: { maxHints: 3, allowSentenceStarter: true, allowModelAnswer: true },
        evaluationCriteria: [{ dimension: "completion", weight: 1, description: "Completed the task in spoken English" }],
        topic: "daily_routine",
        source: "bank",
      },
    },
    {
      module: "foundation_exercise",
      category: "chunk_practice",
      level: "3",
      difficulty: 5,
      topic: "opinions",
      hashSourceText: "Use the chunk In my opinion to talk about remote work",
      payload: {
        id: "ex_seed_chunk_opinion",
        skill: "chunk_retrieval",
        type: "chunk_practice",
        level: 3,
        difficulty: 5,
        instruction: "Sử dụng cụm từ đã cho để phát biểu suy nghĩ của bạn:",
        prompt: "Use the chunk 'In my opinion' to state what you think about working from home.",
        targetPhrase: "In my opinion",
        expectedDurationSec: 20,
        hintPolicy: { maxHints: 3, allowSentenceStarter: true, allowModelAnswer: true },
        evaluationCriteria: [{ dimension: "completion", weight: 1, description: "Used chunk naturally" }],
        topic: "opinions",
        source: "bank",
      },
    },
  ];

  for (const s of seeds) {
    const hash = computeContentHash(s.hashSourceText);
    const id = `cb_${s.module}_${hash.slice(0, 12)}`;
    store.set(id, {
      id,
      module: s.module,
      category: s.category || "general",
      level: s.level || "all",
      difficulty: s.difficulty || 3,
      topic: s.topic || "general",
      content_hash: hash,
      payload: s.payload,
      quality_score: s.qualityScore || 1.0,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Samples a candidate task from the Content Bank using the 70/30 Hybrid Dynamic Policy.
 * 
 * - If forceSource === "ai": returns null (forces real-time LLM generation)
 * - If forceSource === "bank": forces bank retrieval
 * - If forceSource === "auto" (default):
 *     - Rolls dice: 70% chance to fetch from Bank, 30% chance to trigger real-time AI.
 *     - Applies 14-day anti-repetition filter on recent user exposures.
 *     - If no valid candidate in Bank: returns null (graceful fallback to real-time AI).
 */
export async function sampleBankTask<T>(
  options: SampleBankOptions
): Promise<SampleBankResult<T> | null> {
  const {
    module,
    category,
    difficulty,
    level,
    topic,
    userId = "local_user",
    maxAgeDays = 14,
    bankRatio = 0.7,
    forceSource = "auto",
  } = options;

  // 1. Check force mode
  if (forceSource === "ai") {
    return null;
  }

  // 2. Hybrid dice roll: 30% of the time, inject dynamic LLM novelty
  if (forceSource === "auto") {
    const dice = Math.random();
    if (dice > bankRatio) {
      return null;
    }
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffIso = cutoffDate.toISOString();

  // Try Supabase first if available
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      if (supabase) {
        // Query recent exposures for this user to exclude recently seen tasks
        const { data: recentExposures } = await supabase
          .from("user_content_exposures")
          .select("content_id")
          .eq("user_id", userId)
          .eq("module", module)
          .gte("exposed_at", cutoffIso);

        const excludedIds = new Set<string>((recentExposures || []).map((e: { content_id: string }) => e.content_id));

        // Query candidate items
        let query = supabase
          .from("content_banks")
          .select("*")
          .eq("module", module);

        if (category && category !== "all") {
          query = query.eq("category", category);
        }

        if (level && level !== "all") {
          query = query.eq("level", level);
        }

        if (difficulty !== undefined) {
          // Allow flexible range +-1 if difficulty is specified
          query = query
            .gte("difficulty", Math.max(1, difficulty - 1))
            .lte("difficulty", Math.min(10, difficulty + 1));
        }

        if (topic && topic !== "general" && topic !== "auto") {
          query = query.eq("topic", topic);
        }

        const { data: candidates, error } = await query.order("usage_count", { ascending: true }).limit(20);

        if (!error && candidates && candidates.length > 0) {
          // Filter out excluded IDs
          let pool = candidates.filter((c: ContentBankRecord) => !excludedIds.has(c.id));
          // If all candidates have been seen, fall back to the least-recently used one
          if (pool.length === 0) {
            pool = candidates;
          }

          if (pool.length > 0) {
            // Pick a random candidate from top candidates to maintain variety
            const selected = pool[Math.floor(Math.random() * Math.min(pool.length, 5))] as ContentBankRecord;

            // Increment usage count asynchronously
            supabase
              .from("content_banks")
              .update({
                usage_count: (selected.usage_count || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", selected.id)
              .then(() => {});

            return {
              task: selected.payload as T,
              contentId: selected.id,
              source: "bank",
              usageCount: (selected.usage_count || 0) + 1,
            };
          }
        }
      }
    } catch {
      // Fall through to memory store if Supabase fails
    }
  }

  // Fallback to In-Memory store
  const memStore = getMemoryBankStore();
  const exposures = getMemoryExposuresStore();
  const recentExposures = new Set(
    exposures
      .filter((e) => e.user_id === userId && e.module === module && e.exposed_at >= cutoffIso)
      .map((e) => e.content_id)
  );

  const candidates: ContentBankRecord[] = [];
  for (const record of memStore.values()) {
    if (record.module !== module) continue;
    if (category && category !== "all" && record.category !== "all" && record.category !== category) continue;
    if (level && level !== "all" && record.level !== "all" && record.level !== level) continue;
    if (difficulty !== undefined) {
      const diffDelta = Math.abs(record.difficulty - difficulty);
      if (diffDelta > 1) continue;
    }
    candidates.push(record);
  }

  if (candidates.length === 0) {
    return null;
  }

  let pool = candidates.filter((c) => !recentExposures.has(c.id));
  if (pool.length === 0) {
    pool = candidates;
  }

  // Sort by usage count and pick randomly among lowest usage
  pool.sort((a, b) => a.usage_count - b.usage_count);
  const selected = pool[Math.floor(Math.random() * Math.min(pool.length, 3))];

  selected.usage_count += 1;
  selected.updated_at = new Date().toISOString();

  return {
    task: selected.payload as T,
    contentId: selected.id,
    source: "bank",
    usageCount: selected.usage_count,
  };
}

/**
 * Saves a newly AI-generated task into the Content Bank.
 * Automatically computes normalized SHA-256 hash for deduplication.
 */
export async function saveBankTask(input: SaveBankTaskInput): Promise<ContentBankRecord> {
  const {
    module,
    category = "general",
    level = "all",
    difficulty = 3,
    topic = "general",
    payload,
    hashSourceText,
    qualityScore = 1.0,
  } = input;

  const contentHash = computeContentHash(hashSourceText);
  const id = `cb_${module}_${contentHash.slice(0, 16)}`;
  const now = new Date().toISOString();

  const record: ContentBankRecord = {
    id,
    module,
    category,
    level,
    difficulty,
    topic,
    content_hash: contentHash,
    payload,
    quality_score: qualityScore,
    usage_count: 1,
    created_at: now,
    updated_at: now,
  };

  // 1. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      if (supabase) {
        const { error } = await supabase.from("content_banks").upsert(
          {
            id: record.id,
            module: record.module,
            category: record.category,
            level: record.level,
            difficulty: record.difficulty,
            topic: record.topic,
            content_hash: record.content_hash,
            payload: record.payload,
            quality_score: record.quality_score,
            usage_count: 1,
            updated_at: now,
          },
          { onConflict: "module,content_hash" }
        );
        if (!error) {
          return record;
        }
      }
    } catch {
      // Fall through to memory store
    }
  }

  // 2. Save in Memory
  const memStore = getMemoryBankStore();
  const existing = memStore.get(id);
  if (existing) {
    existing.usage_count += 1;
    existing.updated_at = now;
    return existing;
  }

  memStore.set(id, record);
  return record;
}

/**
 * Quick helper to retrieve a reliable fallback item from the bank without random sampling bias.
 */
export async function getFallbackBankTask<T>(opts: {
  module: string;
  category?: string;
  level?: string;
  difficulty?: number;
}): Promise<T | null> {
  const sampled = await sampleBankTask<T>({
    ...opts,
    forceSource: "bank",
    bankRatio: 1.0,
    maxAgeDays: 365,
  });
  return sampled ? sampled.task : null;
}

/**
 * Directly finds a task by exact content hash (e.g. for simplification of a specific sentence or exact vocabulary lookup).
 */
export async function findBankTaskByHash<T>(
  module: string,
  hashSourceText: string
): Promise<T | null> {
  const hash = computeContentHash(hashSourceText);

  // 1. Check Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("content_banks")
          .select("id, payload, usage_count")
          .eq("module", module)
          .eq("content_hash", hash)
          .maybeSingle();

        if (!error && data?.payload) {
          supabase
            .from("content_banks")
            .update({
              usage_count: (data.usage_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.id)
            .then(() => {});

          return data.payload as T;
        }
      }
    } catch {}
  }

  // 2. Check In-Memory
  const memStore = getMemoryBankStore();
  for (const record of memStore.values()) {
    if (record.module === module && record.content_hash === hash) {
      record.usage_count = (record.usage_count || 0) + 1;
      return record.payload as T;
    }
  }

  return null;
}

/**
 * Records a user's exposure to a specific task to prevent repetitive drills.
 */
export async function recordUserExposure(
  contentId: string,
  module: string,
  userId = "local_user",
  score?: number
): Promise<void> {
  const exposureId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      if (supabase) {
        await supabase.from("user_content_exposures").insert({
          id: exposureId,
          user_id: userId,
          content_id: contentId,
          module,
          exposed_at: now,
          score,
          completed: true,
        });
        return;
      }
    } catch {
      // Fallback to memory
    }
  }

  const exposures = getMemoryExposuresStore();
  exposures.push({
    id: exposureId,
    user_id: userId,
    content_id: contentId,
    module,
    exposed_at: now,
    score,
    completed: true,
  });

  // Limit memory store to last 500 items
  if (exposures.length > 500) {
    exposures.splice(0, exposures.length - 500);
  }
}

/**
 * Returns summary statistics of the Content Bank for debugging and analytics.
 */
export async function getContentBankStats(): Promise<{
  totalItems: number;
  byModule: Record<string, number>;
  totalExposures: number;
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      if (supabase) {
        const { data: banks } = await supabase.from("content_banks").select("module");
        const { count: exposureCount } = await supabase
          .from("user_content_exposures")
          .select("*", { count: "exact", head: true });

        const byModule: Record<string, number> = {};
        for (const item of banks || []) {
          byModule[item.module] = (byModule[item.module] || 0) + 1;
        }

        return {
          totalItems: (banks || []).length,
          byModule,
          totalExposures: exposureCount || 0,
        };
      }
    } catch {
      // fallback
    }
  }

  const memStore = getMemoryBankStore();
  const exposures = getMemoryExposuresStore();
  const byModule: Record<string, number> = {};
  for (const item of memStore.values()) {
    byModule[item.module] = (byModule[item.module] || 0) + 1;
  }

  return {
    totalItems: memStore.size,
    byModule,
    totalExposures: exposures.length,
  };
}
