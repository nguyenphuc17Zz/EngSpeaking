export interface PracticeScenario {
  id: string;
  title: string;
  titleVi: string;
  category: string;
  aiRole: string;
  userRole: string;
  goal: string;
  targetTurns: number;
  openingPrompt: string;
  tacticalGuide?: {
    recommendedTone: string;
    strategyTip: string;
    pitfallsToAvoid: string;
  };
}

export const PRESET_SCENARIOS: PracticeScenario[] = [
  {
    id: "tech_interview",
    title: "Software Engineering Job Interview",
    titleVi: "Phỏng vấn Kỹ sư phần mềm",
    category: "interview",
    aiRole: "Senior Tech Hiring Manager",
    userRole: "Software Engineer Candidate",
    goal: "Giới thiệu bản thân, trình bày kinh nghiệm xử lý lỗi hệ thống và trả lời tự tin.",
    targetTurns: 6,
    openingPrompt:
      "Hello! Thank you for joining our interview today. To start off, could you tell me a little bit about yourself and a technical project you recently worked on?",
    tacticalGuide: {
      recommendedTone: "Tự tin, chuyên nghiệp và cầu thị.",
      strategyTip: "Áp dụng kỹ thuật STAR: Bối cảnh -> Thử thách -> Giải pháp kỹ thuật -> Kết quả đo lường được.",
      pitfallsToAvoid: "Tránh trả lời mơ hồ hoặc nói xấu đồng nghiệp/công ty cũ.",
    },
  },
  {
    id: "salary_negotiation",
    title: "Salary & Benefits Negotiation",
    titleVi: "Đàm phán Lương & Phúc lợi",
    category: "workplace",
    aiRole: "HR Director",
    userRole: "Valued Employee",
    goal: "Đề xuất tăng 15% lương dựa trên các đóng góp nổi bật trong quý vừa qua.",
    targetTurns: 6,
    openingPrompt:
      "Good afternoon! I received your request to discuss your compensation package. What accomplishments would you like to highlight today?",
    tacticalGuide: {
      recommendedTone: "Nhã nhặn, quyết đoán và dựa trên dữ liệu thành tích.",
      strategyTip: "Nêu bật các đóng góp doanh thu và trách nhiệm mở rộng trước khi đưa ra con số đề xuất.",
      pitfallsToAvoid: "Tránh đưa ra tối hậu thư hoặc so sánh với đồng nghiệp khác.",
    },
  },
  {
    id: "project_deadline",
    title: "Project Deadline Conflict Discussion",
    titleVi: "Thảo luận xung đột tiến độ",
    category: "workplace",
    aiRole: "Project Manager",
    userRole: "Lead Developer",
    goal: "Giải thích lý do cần thêm 3 ngày kiểm thử bảo mật và đề xuất giải pháp khả thi.",
    targetTurns: 6,
    openingPrompt:
      "Hey, I noticed our release is scheduled for this Friday, but you requested a delay. What seems to be the main blocker on your side?",
    tacticalGuide: {
      recommendedTone: "Trách nhiệm, thấu hiểu và hướng tới giải pháp.",
      strategyTip: "Giải thích rủi ro bảo mật nếu phát hành vội và đề xuất lộ trình phát hành từng phần.",
      pitfallsToAvoid: "Tránh chỉ phàn nàn mà không có phương án thay thế.",
    },
  },
  {
    id: "coffee_smalltalk",
    title: "Casual Networking & Weekend Plans",
    titleVi: "Trò chuyện Small Talk & Cuối tuần",
    category: "daily",
    aiRole: "Friendly International Colleague",
    userRole: "Colleague",
    goal: "Chia sẻ sở thích, thói quen thư giãn và kết nối thân thiện.",
    targetTurns: 5,
    openingPrompt:
      "Hey there! How's your week been going so far? Do you have anything fun planned for the upcoming weekend?",
    tacticalGuide: {
      recommendedTone: "Ấm áp, cởi mở và tự nhiên.",
      strategyTip: "Dùng câu hỏi mở và chia sẻ trải nghiệm cá nhân ngắn gọn để tạo sự đồng điệu.",
      pitfallsToAvoid: "Tránh nói độc thoại quá dài hoặc chọn các chủ đề nhạy cảm.",
    },
  },
  {
    id: "hotel_checkin",
    title: "Hotel Room Issue & Room Upgrade",
    titleVi: "Xử lý phòng khách sạn & Đổi phòng",
    category: "travel",
    aiRole: "Front Desk Concierge",
    userRole: "Hotel Guest",
    goal: "Phàn nàn lịch sự về tiếng ồn máy lạnh và xin đổi sang phòng view biển yên tĩnh.",
    targetTurns: 5,
    openingPrompt:
      "Welcome to the front desk, sir. How can I assist you with your stay this evening?",
    tacticalGuide: {
      recommendedTone: "Lịch thiệp nhưng kiên định.",
      strategyTip: "Cảm ơn sự hỗ trợ trước, sau đó mô tả sự bất tiện và đề nghị phương án cụ thể.",
      pitfallsToAvoid: "Tránh nổi nóng hay đe dọa ngay từ đầu.",
    },
  },
];
