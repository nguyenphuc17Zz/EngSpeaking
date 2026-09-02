// Task Generator Service for Survival Speaking & Circumlocution (Function 7)
// Provides seed libraries and AI generation for Circumlocution and Real-life Scenarios

import { generateTextWithRouting } from "@/lib/ai";
import {
  circumlocutionTaskSchema,
  survivalScenarioTaskSchema,
} from "@/lib/validation/survival-schemas";
import {
  CIRCUMLOCUTION_TASK_SYSTEM,
  SURVIVAL_SCENARIO_SYSTEM,
} from "@/lib/ai/prompts/survival-prompts";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
} from "@/types/survival-speaking";

export const SEED_CIRCUMLOCUTION_TASKS: CircumlocutionTask[] = [
  {
    id: "circ_microwave",
    targetWord: "microwave",
    forbiddenWords: ["microwave", "micro"],
    vietnameseMeaning: "Lò vi sóng",
    category: "Đồ gia dụng (Kitchen Appliance)",
    difficulty: "easy",
    timeLimitSeconds: 5,
    hints: {
      functionHint: "Dùng để hâm nóng thức ăn cực nhanh bằng sóng",
      categoryHint: "Một thiết bị điện tử trong nhà bếp (Kitchen appliance)",
      contextHint: "Thường đặt trên kệ bếp trong nhà hoặc văn phòng",
      starterHint: "It's a kitchen machine that you use to heat up food quickly.",
    },
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây mà không dùng từ cấm." },
      { tier: 1, title: "Chức năng (Function)", content: "Dùng để hâm nóng thức ăn cực nhanh bằng sóng vi ba." },
      { tier: 2, title: "Chủng loại & Vị trí", content: "Một thiết bị điện tử nhà bếp (kitchen appliance), đặt trên kệ hoặc văn phòng." },
      { tier: 3, title: "Khung câu mở đầu", content: "It's a kind of electrical appliance in the kitchen that you use to ______ ." },
      { tier: 4, title: "Câu diễn giải mẫu", content: "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes." },
    ],
    sampleExplanations: [
      "It's a kitchen appliance that you use to heat up cold food or drinks in just a couple of minutes.",
      "It's an electrical box in the kitchen that warms up your meal quickly.",
    ],
    suggestedVocabulary: [
      { term: "a kind of appliance", meaningVi: "một loại thiết bị gia dụng", partOfSpeech: "phrase" },
      { term: "used for heating up", meaningVi: "được dùng để hâm nóng", partOfSpeech: "phrase" },
      { term: "found in the kitchen", meaningVi: "thường thấy trong nhà bếp", partOfSpeech: "phrase" },
    ],
  },
  {
    id: "circ_umbrella",
    targetWord: "umbrella",
    forbiddenWords: ["umbrella", "raincoat"],
    vietnameseMeaning: "Cây dù / Cây ô",
    category: "Vật dụng hàng ngày (Daily Object)",
    difficulty: "easy",
    timeLimitSeconds: 5,
    hints: {
      functionHint: "Dùng để che mưa hoặc che nắng khi đi ngoài đường",
      categoryHint: "Một vật dụng cầm tay có thể mở ra và gập lại",
      contextHint: "Mang theo khi dự báo thời tiết có mưa",
      starterHint: "It's a handheld object that protects you from rain or sunlight.",
    },
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây." },
      { tier: 1, title: "Chức năng (Function)", content: "Dùng để che mưa hoặc che nắng khi đi ngoài trời." },
      { tier: 2, title: "Chủng loại & Cấu tạo", content: "Vật dụng cầm tay có vải chống nước, có thể mở bung ra và gấp gọn lại." },
      { tier: 3, title: "Khung câu mở đầu", content: "It's something you hold above your head when it's ______ so you don't get ______ ." },
      { tier: 4, title: "Câu diễn giải mẫu", content: "It's something you hold above your head when it's raining so you don't get wet." },
    ],
    sampleExplanations: [
      "It's something you hold above your head when it's raining so you don't get wet.",
      "It's a foldable item with a handle that protects you from rain.",
    ],
    suggestedVocabulary: [
      { term: "hold above your head", meaningVi: "cầm giương lên trên đầu", partOfSpeech: "phrase" },
      { term: "protects you from rain", meaningVi: "bảo vệ bạn khỏi nước mưa", partOfSpeech: "phrase" },
      { term: "foldable item", meaningVi: "vật dụng có thể gấp gọn", partOfSpeech: "phrase" },
    ],
  },
  {
    id: "circ_subscription",
    targetWord: "subscription",
    forbiddenWords: ["subscription", "subscribe"],
    vietnameseMeaning: "Gói đăng ký định kỳ (Netflix, Spotify...)",
    category: "Dịch vụ số (Digital Service)",
    difficulty: "medium",
    timeLimitSeconds: 5,
    hints: {
      functionHint: "Thanh toán một khoản tiền định kỳ hàng tháng để sử dụng dịch vụ",
      categoryHint: "Mô hình thanh toán định kỳ",
      contextHint: "Thường thấy ở Netflix, Spotify, ứng dụng phần mềm",
      starterHint: "It's an agreement where you pay a monthly fee to access a service.",
    },
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây." },
      { tier: 1, title: "Bản chất", content: "Thanh toán định kỳ hàng tháng/năm để duy trì quyền truy cập dịch vụ." },
      { tier: 2, title: "Bối cảnh thực tế", content: "Rất phổ biến với Netflix, Spotify, hoặc ứng dụng xem phim trực tuyến." },
      { tier: 3, title: "Khung câu mở đầu", content: "It's when you pay a monthly fee to keep access to ______ ." },
      { tier: 4, title: "Câu diễn giải mẫu", content: "It's when you pay an amount of money every month to continue using a service like Netflix or Spotify." },
    ],
    sampleExplanations: [
      "It's when you pay an amount of money every month to continue using a service like Netflix or Spotify.",
      "It's a recurring payment plan for continuous access to an app.",
    ],
    suggestedVocabulary: [
      { term: "recurring payment", meaningVi: "thanh toán định kỳ lặp lại", partOfSpeech: "phrase" },
      { term: "monthly fee", meaningVi: "phí hàng tháng", partOfSpeech: "phrase" },
      { term: "continuous access", meaningVi: "quyền truy cập liên tục", partOfSpeech: "phrase" },
    ],
  },
  {
    id: "circ_algorithm",
    targetWord: "algorithm",
    forbiddenWords: ["algorithm", "code"],
    vietnameseMeaning: "Thuật toán máy tính",
    category: "Công nghệ (Technology & Math)",
    difficulty: "hard",
    timeLimitSeconds: 5,
    hints: {
      functionHint: "Một tập hợp các quy tắc từng bước để máy tính giải quyết vấn đề",
      categoryHint: "Quy trình tính toán toán học/lập trình",
      contextHint: "Quyết định video nào xuất hiện trên TikTok hoặc YouTube của bạn",
      starterHint: "It's a set of step-by-step mathematical rules that a computer follows.",
    },
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây." },
      { tier: 1, title: "Bản chất", content: "Một chuỗi các chỉ dẫn logic từng bước để máy tính xử lý dữ liệu." },
      { tier: 2, title: "Ứng dụng đời thực", content: "Cơ chế quyết định nội dung đề xuất trên YouTube, TikTok hoặc Google Search." },
      { tier: 3, title: "Khung câu mở đầu", content: "It's a set of step-by-step mathematical rules that a computer ______ to ______ ." },
      { tier: 4, title: "Câu diễn giải mẫu", content: "It's a set of step-by-step instructions that computers use to solve problems or recommend content." },
    ],
    sampleExplanations: [
      "It's a set of step-by-step instructions that computers use to solve problems or recommend videos.",
      "It's mathematical logic that determines what you see on social media feeds.",
    ],
    suggestedVocabulary: [
      { term: "step-by-step rules", meaningVi: "các quy tắc từng bước một", partOfSpeech: "phrase" },
      { term: "recommend content", meaningVi: "gợi ý nội dung đề xuất", partOfSpeech: "phrase" },
      { term: "process data", meaningVi: "xử lý dữ liệu", partOfSpeech: "phrase" },
    ],
  },
];

export const SEED_SURVIVAL_SCENARIOS: SurvivalScenarioTask[] = [
  {
    id: "scen_interview_fast",
    context: "job_interview",
    contextTitleVi: "Phỏng vấn xin việc (Job Interview)",
    problemDescriptionVi: "Người phỏng vấn nói rất nhanh một thuật ngữ chuyên ngành phức tạp mà bạn chưa kịp nghe rõ.",
    audioPromptText: "Could you elaborate on how your algorithmic optimization reduced backend latency?",
    recommendedSkill: "asking_repetition",
    suggestedRepairPhrases: [
      "Sorry, could you say that again a little more slowly?",
      "I didn't quite catch the last part. Could you repeat that, please?",
    ],
    timeLimitSeconds: 5,
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Phản xạ cứu cánh ngay lập tức." },
      { tier: 1, title: "Chiến lược xử lý", content: "Lịch sự xin người phỏng vấn nhắc lại câu hỏi với tốc độ chậm hơn một chút." },
      { tier: 2, title: "Cụm từ cứu cánh", content: "Sorry, could you repeat that / I didn't quite catch that..." },
      { tier: 3, title: "Khung câu ứng biến", content: "Sorry, could you say that again ______ because ______ ?" },
      { tier: 4, title: "Câu mẫu chuẩn bản xứ", content: "I'm sorry, I didn't quite catch the last part. Could you say that again a little more slowly?" },
    ],
    suggestedVocabulary: [
      { term: "I didn't quite catch that", meaningVi: "Tôi chưa nghe kịp phần đó", partOfSpeech: "phrase" },
      { term: "say that again slowly", meaningVi: "nói lại chậm hơn một chút", partOfSpeech: "phrase" },
      { term: "could you elaborate", meaningVi: "bạn có thể giải thích chi tiết hơn", partOfSpeech: "phrase" },
    ],
  },
  {
    id: "scen_workplace_thinking",
    context: "workplace_meeting",
    contextTitleVi: "Cuộc họp công ty (Workplace Meeting)",
    problemDescriptionVi: "Sếp bất ngờ hỏi quan điểm của bạn về chiến lược quý tới và bạn cần 3-5 giây để suy nghĩ.",
    audioPromptText: "What are your thoughts on our proposed Q3 marketing budget allocation?",
    recommendedSkill: "buying_time",
    suggestedRepairPhrases: [
      "That's a very interesting question. Let me think for a second...",
      "Well, to be honest, let me see how we should approach this...",
    ],
    timeLimitSeconds: 5,
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Phản xạ mua thời gian ngay." },
      { tier: 1, title: "Chiến lược xử lý", content: "Dùng cụm đệm khen câu hỏi hay hoặc xin 2-3 giây suy nghĩ thay vì ngồi im lặng." },
      { tier: 2, title: "Cụm từ cứu cánh", content: "That's a great question. Let me think for a moment..." },
      { tier: 3, title: "Khung câu ứng biến", content: "That's a very interesting point. Off the top of my head, ______ ." },
      { tier: 4, title: "Câu mẫu chuẩn bản xứ", content: "That's a really interesting question. Let me think for just a second on how to frame this." },
    ],
    suggestedVocabulary: [
      { term: "let me think for a second", meaningVi: "cho tôi suy nghĩ một giây", partOfSpeech: "phrase" },
      { term: "off the top of my head", meaningVi: "theo suy nghĩ ngay lúc này", partOfSpeech: "phrase" },
      { term: "to be completely honest", meaningVi: "thành thật mà nói", partOfSpeech: "phrase" },
    ],
  },
  {
    id: "scen_misunderstanding_restaurant",
    context: "restaurant",
    contextTitleVi: "Nhà hàng (Restaurant)",
    problemDescriptionVi: "Bồi bàn tưởng bạn muốn hủy toàn bộ đơn hàng nhưng bạn chỉ muốn đổi món khai vị.",
    audioPromptText: "So you would like to cancel your entire order, right?",
    recommendedSkill: "misunderstanding_recovery",
    suggestedRepairPhrases: [
      "No, sorry, what I meant was I only want to change the appetizer, not cancel everything.",
      "That's not exactly what I meant. I just want to switch the soup to a salad.",
    ],
    timeLimitSeconds: 5,
    tierHints: [
      { tier: 0, title: "Không gợi ý", content: "Đính chính sự hiểu nhầm ngay." },
      { tier: 1, title: "Chiến lược xử lý", content: "Dùng mẫu đính chính lịch sự 'What I meant was...' để giải tỏa hiểu nhầm." },
      { tier: 2, title: "Cụm từ cứu cánh", content: "That's not quite what I meant / What I actually meant was..." },
      { tier: 3, title: "Khung câu ứng biến", content: "Oh sorry, that's not what I meant. I only wanted to ______ ." },
      { tier: 4, title: "Câu mẫu chuẩn bản xứ", content: "Oh sorry, that's not quite what I meant. I just want to change the appetizer, not cancel the entire meal." },
    ],
    suggestedVocabulary: [
      { term: "that's not what I meant", meaningVi: "đó không phải là ý tôi muốn nói", partOfSpeech: "phrase" },
      { term: "what I actually meant was", meaningVi: "điều tôi thực sự muốn nói là", partOfSpeech: "phrase" },
      { term: "switch A to B", meaningVi: "đổi từ A sang B", partOfSpeech: "phrase" },
    ],
  },
];

function cleanJson(text: string): unknown {
  let cleaned = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  // Clean invalid assignments like "var_name = " inside arrays/objects
  cleaned = cleaned.replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1");
  // Clean trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const candidate = m[0]
          .replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1")
          .replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(candidate);
      } catch {}
    }
    return null;
  }
}

export async function generateCircumlocutionTask(options: {
  difficulty?: "easy" | "medium" | "hard";
  provider?: string;
  model?: string;
} = {}): Promise<CircumlocutionTask> {
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const selected = SEED_CIRCUMLOCUTION_TASKS[Math.floor(Math.random() * SEED_CIRCUMLOCUTION_TASKS.length)];
    return { ...selected, id: `circ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  }

  const domains = [
    "Household & Appliances",
    "Workplace & Office Tools",
    "Digital Technology & Software",
    "Travel, Flight & Luggage",
    "Food, Cooking & Restaurant",
    "Business & Finance Terms",
    "Medical & Health Equipment",
    "Social & Emotional Concepts",
  ];
  const chosenDomain = domains[Math.floor(Math.random() * domains.length)];

  const userPrompt = `Generate an authentic Circumlocution Speaking task in domain "${chosenDomain}" with difficulty "${options.difficulty || "medium"}".
The learner must describe this concept without using the forbidden target word. Return strict JSON.`;

  const attemptGenerate = async (): Promise<CircumlocutionTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CIRCUMLOCUTION_TASK_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1400,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `circ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }

      // Ensure hints object exists
      if (!parsed.hints || typeof parsed.hints !== "object") {
        parsed.hints = {
          functionHint: "Dùng trong sinh hoạt hoặc công việc hằng ngày",
          categoryHint: "Một vật dụng hoặc khái niệm phổ biến",
          contextHint: "Thường gặp trong cuộc sống",
          starterHint: "It's a kind of item that you use to...",
        };
      }

      // Sanitize 4-tier stepper hints
      if (!Array.isArray(parsed.tierHints) || parsed.tierHints.length === 0) {
        const h = parsed.hints as Record<string, string>;
        const samples = Array.isArray(parsed.sampleExplanations) ? (parsed.sampleExplanations as string[]) : [];
        parsed.tierHints = [
          { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây mà không dùng từ cấm." },
          { tier: 1, title: "Chức năng", content: h.functionHint || "Mô tả công dụng cốt lõi của khái niệm này." },
          { tier: 2, title: "Chủng loại & Vị trí", content: `${h.categoryHint || ""} ${h.contextHint ? `— ${h.contextHint}` : ""}`.trim() || "Chủng loại và bối cảnh sử dụng" },
          { tier: 3, title: "Khung câu mở đầu", content: h.starterHint || "It's a kind of ______ that you use to ______ ." },
          { tier: 4, title: "Câu diễn giải mẫu", content: samples[0] || "It's an item that you use when you want to..." },
        ];
      } else {
        parsed.tierHints = (parsed.tierHints as any[]).map((th, i) => ({
          tier: typeof th.tier === "number" ? th.tier : i,
          title: String(th.title || `Tầng ${i}`),
          content: String(th.content || ""),
        }));
      }

      // Sanitize suggestedVocabulary
      if (!Array.isArray(parsed.suggestedVocabulary) || parsed.suggestedVocabulary.length === 0) {
        parsed.suggestedVocabulary = [
          { term: "a kind of", meaningVi: "một dạng / một loại", partOfSpeech: "phrase" },
          { term: "used for", meaningVi: "được dùng để", partOfSpeech: "phrase" },
          { term: "you can find it in", meaningVi: "bạn có thể tìm thấy nó ở", partOfSpeech: "phrase" },
        ];
      }

      const validated = circumlocutionTaskSchema.safeParse(parsed);
      if (!validated.success) {
        console.error("circumlocutionTaskSchema validation failed:", validated.error.issues);
        return null;
      }
      return validated.data as CircumlocutionTask;
    } catch (err: any) {
      console.error("generateCircumlocutionTask error:", err?.message || err);
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  if (!task) {
    throw new Error("Không thể tạo bài tập Circumlocution từ AI. Vui lòng thử lại.");
  }

  return task;
}

export async function generateSurvivalScenarioTask(options: {
  context?: string;
  provider?: string;
  model?: string;
} = {}): Promise<SurvivalScenarioTask> {
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const selected = SEED_SURVIVAL_SCENARIOS[Math.floor(Math.random() * SEED_SURVIVAL_SCENARIOS.length)];
    return { ...selected, id: `scen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  }

  const contexts = [
    "Job Interview (interviewer speaks too fast or uses tough terminology)",
    "Workplace & Team Meeting (boss asks unexpected opinion on budget/strategy)",
    "Client Presentation (client asks tricky question or disagrees)",
    "Airport & Immigration (officer asks for unexpected paperwork)",
    "Restaurant & Dining (wrong order or bill dispute)",
    "Technical Discussion (complex technical term you forgot)",
    "Phone & Video Call (audio cutting out, need 5 seconds to find info)",
  ];
  const chosenContext = options.context || contexts[Math.floor(Math.random() * contexts.length)];

  const userPrompt = `Generate an authentic Real-Life Survival Communication Scenario in context: "${chosenContext}".
Create a real problem where the speaker must immediately react and repair the conversation within 5 seconds. Return strict JSON.`;

  const attemptGenerate = async (): Promise<SurvivalScenarioTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: SURVIVAL_SCENARIO_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1400,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `scen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }

      const phrases = Array.isArray(parsed.suggestedRepairPhrases)
        ? (parsed.suggestedRepairPhrases as string[])
        : ["Sorry, could you repeat that please?"];

      // Sanitize 4-tier stepper hints
      if (!Array.isArray(parsed.tierHints) || parsed.tierHints.length === 0) {
        parsed.tierHints = [
          { tier: 0, title: "Không gợi ý", content: "Phản xạ cứu cánh ngay lập tức." },
          { tier: 1, title: "Chiến lược ứng biến", content: `Chiến lược khuyến nghị: ${String(parsed.recommendedSkill || "Ứng biến nhanh")}` },
          { tier: 2, title: "Cụm từ cứu cánh", content: phrases.slice(0, 2).join(" / ") },
          { tier: 3, title: "Khung câu ứng biến", content: `Sorry, ${phrases[0]?.split(" ")[0] || "could you"} ______ ?` },
          { tier: 4, title: "Câu mẫu chuẩn bản xứ", content: phrases[0] || "Sorry, could you say that again a little more slowly?" },
        ];
      } else {
        parsed.tierHints = (parsed.tierHints as any[]).map((th, i) => ({
          tier: typeof th.tier === "number" ? th.tier : i,
          title: String(th.title || `Tầng ${i}`),
          content: String(th.content || ""),
        }));
      }

      // Sanitize suggestedVocabulary
      if (!Array.isArray(parsed.suggestedVocabulary) || parsed.suggestedVocabulary.length === 0) {
        parsed.suggestedVocabulary = phrases.slice(0, 3).map((p) => ({
          term: p,
          meaningVi: "cụm từ cứu cánh giao tiếp",
          partOfSpeech: "phrase",
        }));
      }

      const validated = survivalScenarioTaskSchema.safeParse(parsed);
      if (!validated.success) {
        console.error("survivalScenarioTaskSchema validation failed:", validated.error.issues);
        return null;
      }
      return validated.data as SurvivalScenarioTask;
    } catch (err: any) {
      console.error("generateSurvivalScenarioTask error:", err?.message || err);
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  if (!task) {
    throw new Error("Không thể tạo tình huống Survival Scenario từ AI. Vui lòng thử lại.");
  }

  return task;
}
