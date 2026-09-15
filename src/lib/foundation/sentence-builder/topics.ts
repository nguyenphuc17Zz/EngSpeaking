// Sentence Builder Topic Definitions & Infinite Random Pool
// Provides boundless diversity for spoken retrieval practice

export interface SentenceBuilderTopicItem {
  id: string;
  labelVi: string;
  labelEn: string;
  icon: string; // Lucide icon identifier
  descriptionVi: string;
  category: "daily" | "work" | "travel" | "social" | "lifestyle";
  sampleSituations: string[];
}

export const PRESET_TOPICS: SentenceBuilderTopicItem[] = [
  {
    id: "random",
    labelVi: "Ngẫu nhiên đa dạng",
    labelEn: "Infinite Surprise",
    icon: "Sparkles",
    descriptionVi: "Mỗi câu 1 chủ đề bất ngờ, kích hoạt phản xạ toàn diện",
    category: "lifestyle",
    sampleSituations: ["Bất kỳ tình huống đời thực bất ngờ"],
  },
  {
    id: "daily_life",
    labelVi: "Đời sống & Thói quen",
    labelEn: "Daily Routine",
    icon: "Coffee",
    descriptionVi: "Thói quen buổi sáng, dọn dẹp, gia đình, sinh hoạt thường nhật",
    category: "daily",
    sampleSituations: [
      "Thói quen thức dậy và uống cà phê",
      "Nấu bữa tối sau một ngày bận rộn",
      "Lập kế hoạch công việc cuối tuần",
      "Phàn nàn về việc kẹt xe buổi sáng",
    ],
  },
  {
    id: "workplace",
    labelVi: "Công sở & Sự nghiệp",
    labelEn: "Workplace & Career",
    icon: "Briefcase",
    descriptionVi: "Họp hành, dự án, báo cáo tiến độ, đàm phán, deadline",
    category: "work",
    sampleSituations: [
      "Cập nhật tiến độ dự án cho quản lý",
      "Xin gia hạn deadline vì phát sinh lỗi kỹ thuật",
      "Đưa ra ý kiến phản biện trong cuộc họp",
      "Nhờ đồng nghiệp hỗ trợ kiểm tra tài liệu",
    ],
  },
  {
    id: "travel",
    labelVi: "Du lịch & Khách sạn",
    labelEn: "Travel & Hotels",
    icon: "Plane",
    descriptionVi: "Sân bay, khách sạn, hỏi đường, thủ tục vé, đổi ngoại tệ",
    category: "travel",
    sampleSituations: [
      "Làm thủ tục check-in tại khách sạn và yêu cầu phòng view đẹp",
      "Hỏi đường đến ga tàu điện ngầm gần nhất",
      "Báo thất lạc hành lý tại quầy chăm sóc khách hàng sân bay",
      "Hỏi nhân viên về các tour tham quan trong ngày",
    ],
  },
  {
    id: "food_dining",
    labelVi: "Ẩm thực & Nhà hàng",
    labelEn: "Food & Dining",
    icon: "Utensils",
    descriptionVi: "Gọi món, quán cà phê, dị ứng đồ ăn, thanh toán hóa đơn",
    category: "daily",
    sampleSituations: [
      "Gọi món tại nhà hàng và nhờ gợi ý món đặc sản",
      "Yêu cầu không bỏ hành và ít cay trong món ăn",
      "Phàn nàn nhẹ nhàng vì món ăn bị nguội",
      "Yêu cầu chia hóa đơn thanh toán riêng",
    ],
  },
  {
    id: "shopping",
    labelVi: "Mua sắm & Dịch vụ",
    labelEn: "Shopping & Retail",
    icon: "ShoppingBag",
    descriptionVi: "Hỏi size, trả giá, đổi trả hàng, săn giảm giá",
    category: "lifestyle",
    sampleSituations: [
      "Hỏi nhân viên xem còn cỡ giày lớn hơn không",
      "Yêu cầu đổi sản phẩm bị lỗi trong thời hạn bảo hành",
      "Hỏi về chương trình khuyến mãi mua 1 tặng 1",
      "Thương lượng giá cả tại chợ đồ lưu niệm",
    ],
  },
  {
    id: "technology",
    labelVi: "Công nghệ & Kỹ thuật",
    labelEn: "Technology & AI",
    icon: "Laptop",
    descriptionVi: "Phần mềm, sửa lỗi máy tính, mạng xã hội, thiết bị thông minh",
    category: "work",
    sampleSituations: [
      "Mô tả sự cố ứng dụng bị crash khi tải file lớn",
      "Thảo luận về ứng dụng của trí tuệ nhân tạo trong công việc",
      "Nhờ bộ phận IT hỗ trợ khôi phục mật khẩu tài khoản",
      "Đánh giá tính năng mới của chiếc smartphone vừa ra mắt",
    ],
  },
  {
    id: "social_smalltalk",
    labelVi: "Xã giao & Bạn bè",
    labelEn: "Small Talk & Social",
    icon: "MessageCircle",
    descriptionVi: "Bắt chuyện, thời tiết, sở thích, bàn luận phim ảnh, tiệc tùng",
    category: "social",
    sampleSituations: [
      "Bắt chuyện với người lạ tại hội thảo chuyên ngành",
      "Bình luận về thời tiết bất thường gần đây",
      "Hỏi thăm kế hoạch nghỉ lễ sắp tới của bạn bè",
      "Chia sẻ cảm nhận về bộ phim bom tấn vừa xem",
    ],
  },
  {
    id: "health_fitness",
    labelVi: "Sức khỏe & Thể thao",
    labelEn: "Health & Fitness",
    icon: "HeartPulse",
    descriptionVi: "Khám bác sĩ, triệu chứng bệnh, tập gym, ăn kiêng lành mạnh",
    category: "lifestyle",
    sampleSituations: [
      "Mô tả triệu chứng đau đầu và sốt nhẹ với bác sĩ",
      "Hỏi huấn luyện viên về lịch tập giảm mỡ hiệu quả",
      "Mua thuốc tại nhà thuốc và hỏi về cách dùng",
      "Từ chối lời mời uống rượu vì lý do sức khỏe",
    ],
  },
  {
    id: "interview_career",
    labelVi: "Phỏng vấn & Đàm phán",
    labelEn: "Job Interview & Career",
    icon: "GraduationCap",
    descriptionVi: "Giới thiệu điểm mạnh, thỏa thuận lương, kế hoạch phát triển",
    category: "work",
    sampleSituations: [
      "Tự tin trả lời về điểm mạnh lớn nhất của bản thân",
      "Giải thích lý do muốn chuyển đổi công việc hiện tại",
      "Khéo léo thương lượng mức lương và chế độ đãi ngộ",
      "Đặt câu hỏi cho nhà tuyển dụng về văn hóa công ty",
    ],
  },
];

// Rich, expansive pool for dynamic infinite surprise generation
export const INFINITE_TOPIC_POOL: string[] = [
  "Ordering a customized iced coffee with oat milk and half sugar",
  "Explaining why a project delivery might be delayed by two days to a client",
  "Asking a hotel receptionist for late check-out and extra pillows",
  "Reporting a lost baggage at an international airport customer service desk",
  "Expressing polite disagreement in a team meeting regarding design direction",
  "Returning a shirt to a clothing store because of a missing button",
  "Asking a pharmacist for non-drowsy cold medicine recommendations",
  "Complimenting a coworker on their presentation delivery",
  "Negotiating a monthly gym membership discount with a sales consultant",
  "Describing your favorite childhood memory to an international friend",
  "Asking for directions to a subway station when your phone battery died",
  "Explaining how a bug in the code happens only on mobile safari",
  "Declining an invitation to dinner politely due to a prior commitment",
  "Booking a table for 4 at a busy Italian restaurant for Friday evening",
  "Discussing weekend hiking plans with friends while checking weather forecast",
  "Giving feedback to a ride-share driver about taking a faster route",
  "Explaining to a landlord that the air conditioner has been leaking water",
  "Asking a barista what kind of coffee beans they use for espresso",
  "Talking about the pros and cons of remote working versus office work",
  "Ordering street food in a bustling night market and asking if it contains peanuts",
  "Congratulating a colleague on their recent promotion",
  "Asking an IT support technician to unlock your company email account",
  "Debating which movie to watch at the cinema tonight with your partner",
  "Explaining your dietary preferences (vegetarian / low carb) at a dinner party",
  "Inquiring about tourist visa extension requirements at an immigration office",
  "Asking for a refund on a subscription service you forgot to cancel",
  "Sharing your thoughts on the impact of artificial intelligence on daily life",
  "Reporting a broken key card to the hotel front desk late at night",
  "Recommending your favorite local coffee shop to an expat visitor",
  "Explaining why you couldn't attend yesterday's sync meeting",
  "Describing the plot twist of an exciting thriller novel you just finished",
  "Asking a supermarket employee where to find organic gluten-free pasta",
  "Expressing enthusiasm about an upcoming road trip across the coast",
  "Negotiating the price of a vintage souvenir at a flea market",
  "Describing a memorable meal you had while traveling abroad",
  "Asking a colleague to double-check an important email draft before sending",
  "Handling a misunderstanding with a delivery courier regarding your address",
  "Discussing healthy sleep habits and how to stop doomscrolling before bed",
  "Inquiring about car rental insurance coverage options at an airport counter",
  "Explaining a technical concept in simple, accessible terms to a non-tech client",
];

/**
 * Returns a random vivid topic prompt from the infinite pool
 */
export function getRandomTopicPrompt(): string {
  const index = Math.floor(Math.random() * INFINITE_TOPIC_POOL.length);
  return INFINITE_TOPIC_POOL[index] || "natural spoken English in everyday real life";
}

/**
 * Resolves the topic string to pass into AI prompt generation
 */
export function resolveTopicForPrompt(selectedTopicId?: string, customTopicText?: string): string {
  if (customTopicText && customTopicText.trim().length > 0) {
    return `custom_scenario: ${customTopicText.trim()}`;
  }

  if (!selectedTopicId || selectedTopicId === "random") {
    return getRandomTopicPrompt();
  }

  const preset = PRESET_TOPICS.find((t) => t.id === selectedTopicId);
  if (preset && preset.id !== "random") {
    const situation = preset.sampleSituations[Math.floor(Math.random() * preset.sampleSituations.length)];
    return `${preset.id} (${preset.labelEn} — e.g. ${situation})`;
  }

  return selectedTopicId;
}

/**
 * Returns a clean, human-friendly display label for any topic key or custom text
 */
export function getTopicDisplay(topic: string): { label: string; isCustom: boolean } {
  if (!topic) return { label: "Giao tiếp tự nhiên", isCustom: false };

  if (topic.startsWith("custom_scenario:")) {
    return {
      label: topic.replace("custom_scenario:", "").trim(),
      isCustom: true,
    };
  }

  const found = PRESET_TOPICS.find((t) => t.id === topic);
  if (found) {
    return { label: `${found.labelVi} (${found.labelEn})`, isCustom: false };
  }

  return {
    label: topic.replace(/_/g, " "),
    isCustom: false,
  };
}
