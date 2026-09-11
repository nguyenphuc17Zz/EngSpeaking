// Pragmatic Flow DAG Engine for Chunk Automaticity Studio (Function 6)
// Defines discourse graphs, rhetorical transition rules, and dynamic persona scenarios

import type {
  PragmaticStrategyType,
  ChunkChainBlock,
  ChunkChainTask,
} from "@/types/chunk-automaticity";

export interface PragmaticBlockBlueprint {
  blockType: ChunkChainBlock["blockType"];
  labelVi: string;
  rhetoricalRole: string;
  transitionConnector: string;
  suggestedChunk: string;
  alternativeChunks: string[];
}

export interface PragmaticDAGStrategyDefinition {
  strategy: PragmaticStrategyType;
  titleVi: string;
  descriptionVi: string;
  recommendedLatencyMs: number;
  blocksBlueprint: [
    PragmaticBlockBlueprint,
    PragmaticBlockBlueprint,
    PragmaticBlockBlueprint,
    PragmaticBlockBlueprint,
  ];
}

export interface DynamicScenarioSeed {
  domain: "workplace" | "daily_life" | "travel" | "tech_ai" | "opinions" | "career";
  topic: string;
  persona: string;
  situationVi: string;
  targetQuestion: string;
  recommendedStrategy: PragmaticStrategyType;
}

// 1. Five Core Pragmatic Strategies (Directed Discourse Graphs)
export const PRAGMATIC_DAG_STRATEGIES: Record<PragmaticStrategyType, PragmaticDAGStrategyDefinition> = {
  opinion_defense: {
    strategy: "opinion_defense",
    titleVi: "Lập trường & Biện minh (Opinion & Defense)",
    descriptionVi: "Phản xạ mở đầu tự nhiên, nêu quan điểm trực tiếp, giải trình nguyên nhân cốt lõi và chốt bằng ví dụ cụ thể.",
    recommendedLatencyMs: 3500,
    blocksBlueprint: [
      {
        blockType: "buffer",
        labelVi: "1. Câu đệm mở đầu (Buying Time)",
        rhetoricalRole: "Tạo khoảng nghỉ tự nhiên để suy nghĩ và bắt nhịp hội thoại",
        transitionConnector: "Well...",
        suggestedChunk: "Well, to be honest...",
        alternativeChunks: [
          "Honestly speaking...",
          "That's an interesting question...",
          "Off the top of my head...",
          "If you ask me...",
        ],
      },
      {
        blockType: "stance",
        labelVi: "2. Nêu quan điểm (Core Stance)",
        rhetoricalRole: "Khẳng định lập trường cá nhân dứt khoát hoặc có chừng mực",
        transitionConnector: "First of all...",
        suggestedChunk: "I personally feel that...",
        alternativeChunks: [
          "From my perspective...",
          "I'm strongly in favor of...",
          "My takeaway is that...",
          "I definitely lean towards...",
        ],
      },
      {
        blockType: "reason",
        labelVi: "3. Nêu lý do cốt lõi (Core Reason)",
        rhetoricalRole: "Giải trình nguyên nhân sâu xa hoặc động lực thuyết phục",
        transitionConnector: "The main reason is...",
        suggestedChunk: "The main reason is that...",
        alternativeChunks: [
          "This primarily comes down to the fact that...",
          "Because at the end of the day...",
          "It really makes a difference because...",
          "The biggest factor is that...",
        ],
      },
      {
        blockType: "example",
        labelVi: "4. Dẫn chứng thực tế (Concrete Example)",
        rhetoricalRole: "Neo lại quan điểm bằng trải nghiệm hoặc minh chứng cụ thể",
        transitionConnector: "For example...",
        suggestedChunk: "For example, in my daily routine...",
        alternativeChunks: [
          "Take my recent experience as an example...",
          "For instance, just last week...",
          "To give you a real-world example...",
          "As a concrete case in point...",
        ],
      },
    ],
  },

  concession_counter: {
    strategy: "concession_counter",
    titleVi: "Nhượng bộ & Phản biện sắc bén (Concession & Rebuttal)",
    descriptionVi: "Thừa nhận một phần quan điểm đối lập để tăng độ khách quan (IELTS 7.5+), sau đó xoay chuyển lập luận và đưa ra kết luận thuyết phục.",
    recommendedLatencyMs: 4000,
    blocksBlueprint: [
      {
        blockType: "buffer",
        labelVi: "1. Câu đệm đa chiều (Diplomatic Opener)",
        rhetoricalRole: "Tỏ thái độ công tâm, nhìn nhận vấn đề từ nhiều góc độ",
        transitionConnector: "Looking at both sides...",
        suggestedChunk: "Looking at both sides of the coin...",
        alternativeChunks: [
          "To put it in perspective...",
          "Truth be told, it's not black and white...",
          "That's definitely a nuanced topic...",
          "In all fairness...",
        ],
      },
      {
        blockType: "stance",
        labelVi: "2. Nhượng bộ điểm hợp lý (Concession)",
        rhetoricalRole: "Chấp nhận một khía cạnh đúng của phía đối lập",
        transitionConnector: "While it is true that...",
        suggestedChunk: "While it's true that...",
        alternativeChunks: [
          "I admit that on the surface...",
          "There is no denying that...",
          "Granted, one could argue that...",
          "It is fair to say that...",
        ],
      },
      {
        blockType: "reason",
        labelVi: "3. Xoay chuyển phản biện (Counter-Rebuttal)",
        rhetoricalRole: "Chỉ ra mâu thuẫn hoặc điểm yếu lớn hơn của phía đối lập",
        transitionConnector: "Having said that...",
        suggestedChunk: "Having said that, the crucial point is...",
        alternativeChunks: [
          "However, when you dig deeper, ...",
          "Even so, what matters much more is...",
          "On the flip side, we cannot overlook the fact that...",
          "Nonetheless, the overarching reality is...",
        ],
      },
      {
        blockType: "example",
        labelVi: "4. Dẫn chứng thực tiễn chốt hạ (Resolution)",
        rhetoricalRole: "Đưa ra bằng chứng minh họa cho lập luận phản biện",
        transitionConnector: "A clear case in point is...",
        suggestedChunk: "A clear case in point is that...",
        alternativeChunks: [
          "For instance, recent evidence has shown that...",
          "To put this into perspective...",
          "Take the latest industry shift as an example...",
          "In actual practice, you will see that...",
        ],
      },
    ],
  },

  problem_solution: {
    strategy: "problem_solution",
    titleVi: "Chẩn đoán & Đề xuất giải pháp (Problem & Solution)",
    descriptionVi: "Định vị khó khăn, chẩn đoán nguyên nhân gốc rễ, đề xuất hành động thực tiễn và dự báo kết quả tích cực.",
    recommendedLatencyMs: 3800,
    blocksBlueprint: [
      {
        blockType: "buffer",
        labelVi: "1. Thấu cảm & Đóng khung vấn đề (Empathy & Framing)",
        rhetoricalRole: "Thừa nhận độ phức tạp hoặc áp lực của vấn đề",
        transitionConnector: "That is definitely a challenge...",
        suggestedChunk: "That's definitely a tricky challenge...",
        alternativeChunks: [
          "When dealing with an issue like this...",
          "It's a common hurdle many people face...",
          "To tackle this head-on...",
          "From what I have observed...",
        ],
      },
      {
        blockType: "stance",
        labelVi: "2. Chẩn đoán mấu chốt (Diagnosis)",
        rhetoricalRole: "Chỉ ra điểm tắc nghẽn cốt lõi cần giải quyết",
        transitionConnector: "The real issue boils down to...",
        suggestedChunk: "The real issue boils down to...",
        alternativeChunks: [
          "The crux of the matter is that...",
          "The fundamental bottleneck is...",
          "What is really holding things back is...",
          "At the root of the problem lies...",
        ],
      },
      {
        blockType: "reason",
        labelVi: "3. Đề xuất hành động đột phá (Prescriptive Solution)",
        rhetoricalRole: "Đưa ra giải pháp trực diện và khả thi",
        transitionConnector: "The most effective approach is...",
        suggestedChunk: "The most effective approach would be to...",
        alternativeChunks: [
          "What we really need to focus on is...",
          "A practical workaround is to...",
          "The game-changer here is to...",
          "Our top priority should be...",
        ],
      },
      {
        blockType: "example",
        labelVi: "4. Dự phóng kết quả cụ thể (Projected Outcome)",
        rhetoricalRole: "Minh họa tác động tích cực tức thì sau khi áp dụng",
        transitionConnector: "By doing so...",
        suggestedChunk: "By doing so, we can easily...",
        alternativeChunks: [
          "This way, you'll immediately notice...",
          "For example, this will save us a great deal of...",
          "In the long run, this will lead to...",
          "As a direct result, everyone can...",
        ],
      },
    ],
  },

  hypothetical_projection: {
    strategy: "hypothetical_projection",
    titleVi: "Kịch bản giả định & Hệ quả (Hypothetical Projection)",
    descriptionVi: "Đặt tiền đề 'nếu như', phân tích cơ chế vận hành logic và hình dung viễn cảnh cụ thể.",
    recommendedLatencyMs: 3800,
    blocksBlueprint: [
      {
        blockType: "buffer",
        labelVi: "1. Đặt tiền đề tưởng tượng (Hypothetical Opener)",
        rhetoricalRole: "Kêu gọi người nghe bước vào một kịch bản giả lập",
        transitionConnector: "Hypothetically speaking...",
        suggestedChunk: "Hypothetically speaking...",
        alternativeChunks: [
          "If you ask me to imagine...",
          "Assuming for a moment that...",
          "In an ideal scenario...",
          "Looking at what could happen...",
        ],
      },
      {
        blockType: "stance",
        labelVi: "2. Điều kiện kích hoạt (Premise)",
        rhetoricalRole: "Nêu điều kiện tiên quyết hoặc xu hướng giả định",
        transitionConnector: "As long as...",
        suggestedChunk: "As long as we maintain a clear focus...",
        alternativeChunks: [
          "Provided that the circumstances allow...",
          "If this current pattern keeps unfolding...",
          "Assuming that people are willing to adapt...",
          "Unless there is an unexpected setback...",
        ],
      },
      {
        blockType: "reason",
        labelVi: "3. Cơ chế tác động (Mechanism)",
        rhetoricalRole: "Giải thích chuỗi mắt xích tại sao hệ quả lại xảy ra",
        transitionConnector: "This would inevitably lead to...",
        suggestedChunk: "This would inevitably trigger...",
        alternativeChunks: [
          "The ripple effect would be that...",
          "Naturally, this would pave the way for...",
          "Because human nature tends to favor...",
          "It creates an environment where...",
        ],
      },
      {
        blockType: "example",
        labelVi: "4. Hình dung viễn cảnh sống động (Vivid Picture)",
        rhetoricalRole: "Tái hiện một bức tranh cụ thể để người nghe cảm nhận rõ",
        transitionConnector: "Picture a scenario where...",
        suggestedChunk: "Picture a scenario where everyday tasks...",
        alternativeChunks: [
          "In such a situation, you would see...",
          "For instance, imagine what it looks like when...",
          "To put it visually, it would be just like...",
          "A realistic picture would be...",
        ],
      },
    ],
  },

  cause_effect_chain: {
    strategy: "cause_effect_chain",
    titleVi: "Chuỗi nhân quả động (Cause & Effect Chain)",
    descriptionVi: "Dẫn dắt mạch hội thoại từ sự kiện kích hoạt, qua cơ chế lan truyền đến kết quả tất yếu trong đời sống.",
    recommendedLatencyMs: 3600,
    blocksBlueprint: [
      {
        blockType: "buffer",
        labelVi: "1. Cầu nối chuyển dịch (Transitional Bridge)",
        rhetoricalRole: "Mở đầu nhìn nhận quy luật vận hành tự nhiên của sự vật",
        transitionConnector: "When you look closely at how things unfold...",
        suggestedChunk: "When you look closely at how things work...",
        alternativeChunks: [
          "As far as I have observed...",
          "It is pretty evident that...",
          "To get right to the point...",
          "In the grand scheme of things...",
        ],
      },
      {
        blockType: "stance",
        labelVi: "2. Mắt xích khởi phát (Catalyst Event)",
        rhetoricalRole: "Xác định phát súng đầu tiên gây ra biến động",
        transitionConnector: "The initial catalyst is...",
        suggestedChunk: "The initial catalyst is usually that...",
        alternativeChunks: [
          "Whenever a major shift like this occurs...",
          "Once people start realizing that...",
          "The first domino to fall is...",
          "It all begins with the fact that...",
        ],
      },
      {
        blockType: "reason",
        labelVi: "3. Tác động dây chuyền (Direct Propagation)",
        rhetoricalRole: "Chỉ rõ tác động kéo theo không thể tránh khỏi",
        transitionConnector: "It directly leads to...",
        suggestedChunk: "It directly leads to a situation where...",
        alternativeChunks: [
          "This in turn puts pressure on...",
          "Consequently, individuals are pushed to...",
          "As an immediate consequence...",
          "This inevitably feeds into...",
        ],
      },
      {
        blockType: "example",
        labelVi: "4. Biểu hiện cụ thể (Culmination Instance)",
        rhetoricalRole: "Chứng minh qua hiện tượng đời sống đang diễn ra",
        transitionConnector: "A prime example of this is...",
        suggestedChunk: "A prime example of this is how we...",
        alternativeChunks: [
          "Just look at the recent trend of...",
          "For example, in our daily interactions...",
          "You can clearly see this in...",
          "Take the widespread adoption of...",
        ],
      },
    ],
  },
};

// 2. Rich Dynamic Persona & Scenario Seeds
export const DYNAMIC_SCENARIO_SEEDS: DynamicScenarioSeed[] = [
  {
    domain: "workplace",
    topic: "Làm việc từ xa (Remote Work) vs Lên văn phòng",
    persona: "Senior Software Engineer trả lời quản lý nhân sự trong buổi khảo sát chế độ làm việc kết hợp (hybrid)",
    situationVi: "Người quản lý hỏi bạn vì sao bạn cảm thấy làm việc từ xa giúp năng suất tăng cao hơn so với việc bắt buộc lên công ty toàn thời gian.",
    targetQuestion: "Why do you think working remotely is more productive for your daily workflow?",
    recommendedStrategy: "opinion_defense",
  },
  {
    domain: "tech_ai",
    topic: "AI thay thế hay hỗ trợ con người trong công việc?",
    persona: "Product Lead chia sẻ trong buổi tọa đàm công nghệ cùng các đồng nghiệp và đối tác",
    situationVi: "Một đồng nghiệp lo lắng rằng công cụ AI tạo sinh sẽ cướp mất việc làm của mọi người trong 3 năm tới. Bạn phản biện và đưa ra góc nhìn cân bằng.",
    targetQuestion: "Aren't you worried that AI might completely take over our jobs soon?",
    recommendedStrategy: "concession_counter",
  },
  {
    domain: "career",
    topic: "Giải quyết tình trạng kiệt sức (Burnout) nơi công sở",
    persona: "Team Leader tư vấn cho nhân viên cấp dưới đang bị quá tải công việc",
    situationVi: "Một thành viên trong nhóm tâm sự rằng họ liên tục cảm thấy kiệt quệ và mất cân bằng cuộc sống. Hãy chẩn đoán vấn đề và gợi ý giải pháp đột phá.",
    targetQuestion: "I've been feeling completely overwhelmed lately with all these deadlines. What should I do?",
    recommendedStrategy: "problem_solution",
  },
  {
    domain: "opinions",
    topic: "Có nên chuyển từ thành phố lớn về quê làm việc tự do?",
    persona: "Digital Nomad chia sẻ trải nghiệm với bạn bè cũ trong buổi họp lớp",
    situationVi: "Bạn bè hỏi bạn có nghĩ việc rời bỏ đô thị ồn ào để sống ở vùng ngoại ô là một quyết định sáng suốt và bền vững về lâu dài hay không.",
    targetQuestion: "Do you think moving away from the big city is truly a smart long-term lifestyle choice?",
    recommendedStrategy: "concession_counter",
  },
  {
    domain: "daily_life",
    topic: "Thói quen dậy sớm 5 giờ sáng để tập thể dục",
    persona: "Người đam mê lối sống lành mạnh giải thích động lực cho người bạn hay thức khuya",
    situationVi: "Bạn của bạn thắc mắc làm thế nào bạn có thể duy trì việc thức dậy lúc 5 giờ sáng mỗi ngày mà không bị mệt mỏi.",
    targetQuestion: "How on earth do you manage to wake up at 5 AM every morning and still feel energetic?",
    recommendedStrategy: "cause_effect_chain",
  },
  {
    domain: "travel",
    topic: "Trải nghiệm du lịch một mình (Solo Travel)",
    persona: "Khách du lịch tự túc trả lời một người bạn chưa từng dám đi phượt một mình",
    situationVi: "Người bạn bày tỏ nỗi sợ bị lạc lõng hoặc nguy hiểm khi du lịch một mình ở nước ngoài. Hãy đặt ra kịch bản và phân tích lợi ích trưởng thành.",
    targetQuestion: "Aren't you scared of feeling lonely or getting lost when traveling abroad all by yourself?",
    recommendedStrategy: "hypothetical_projection",
  },
  {
    domain: "workplace",
    topic: "Xử lý bất đồng ý kiến trong cuộc họp dự án",
    persona: "Project Coordinator bảo vệ đề xuất tối ưu hóa quy trình trước các bên liên quan",
    situationVi: "Trong cuộc họp nước rút, có ý kiến phản đối việc thay đổi công cụ quản lý dự án. Bạn giải thích nguyên nhân và đề xuất phương án chuyển giao.",
    targetQuestion: "Why should we disrupt our current workflow just to switch to this new tool?",
    recommendedStrategy: "problem_solution",
  },
  {
    domain: "tech_ai",
    topic: "Tác động của mạng xã hội và thuật toán gây nghiện đối với sự tập trung",
    persona: "Nhà sáng tạo nội dung chia sẻ góc nhìn trung thực về thuật toán video ngắn",
    situationVi: "Một thính giả hỏi liệu video ngắn (Shorts/Reels) có đang âm thầm hủy hoại khả năng tập trung sâu của thế hệ trẻ.",
    targetQuestion: "Do you believe short-form video content is genuinely shortening our attention spans?",
    recommendedStrategy: "cause_effect_chain",
  },
];

/**
 * Samples a Pragmatic DAG Blueprint based on user preference or dynamic randomization
 */
export function samplePragmaticDAG(options: {
  strategy?: PragmaticStrategyType;
  topic?: string;
  domain?: DynamicScenarioSeed["domain"];
} = {}): {
  strategyDef: PragmaticDAGStrategyDefinition;
  scenarioSeed: DynamicScenarioSeed;
} {
  // 1. Pick scenario seed
  let candidateSeeds = DYNAMIC_SCENARIO_SEEDS;
  if (options.domain) {
    const filtered = candidateSeeds.filter((s) => s.domain === options.domain);
    if (filtered.length > 0) candidateSeeds = filtered;
  }
  if (options.strategy) {
    const filtered = candidateSeeds.filter((s) => s.recommendedStrategy === options.strategy);
    if (filtered.length > 0) candidateSeeds = filtered;
  }

  const scenarioSeed =
    candidateSeeds[Math.floor(Math.random() * candidateSeeds.length)] ||
    DYNAMIC_SCENARIO_SEEDS[0];

  // If user provided a custom topic override
  if (options.topic && options.topic.trim()) {
    scenarioSeed.topic = options.topic.trim();
  }

  // 2. Determine strategy (explicit or from seed)
  const strategyKey = options.strategy || scenarioSeed.recommendedStrategy || "opinion_defense";
  const strategyDef = PRAGMATIC_DAG_STRATEGIES[strategyKey] || PRAGMATIC_DAG_STRATEGIES.opinion_defense;

  return { strategyDef, scenarioSeed };
}
