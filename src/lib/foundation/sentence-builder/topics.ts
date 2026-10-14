// Sentence Builder Topic Definitions & Infinite Random Pool
// Provides boundless diversity (120+ hyper-specific real-world situations) for spoken retrieval practice

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
    descriptionVi: "Thói quen sinh hoạt, gia đình, nhà cửa, quản lý thời gian thường nhật",
    category: "daily",
    sampleSituations: [
      "Nhờ hàng xóm nhận giúp kiện hàng giao buổi chiều",
      "Giải thích với chủ nhà về sự cố rò nước ở bồn rửa bát",
      "Thương lượng phân chia lịch dọn dẹp căn hộ với bạn cùng phòng",
      "Hỏi nhân viên tòa nhà về lịch bảo trì thang máy",
      "Chia sẻ bí quyết sắp xếp bữa ăn lành mạnh cho cả tuần bận rộn",
      "Kể về việc đổi thói quen thức khuya sang dậy sớm chạy bộ",
      "Nhờ thợ điện kiểm tra ổ cắm bị chập chờn trong phòng làm việc",
      "Bàn với người thân về việc cắt giảm các khoản đăng ký dịch vụ không dùng đến",
      "Giải thích lý do bạn đến muộn 15 phút vì tàu điện đổi tuyến đột xuất",
      "Đề xuất trồng thêm cây xanh ở ban công để giảm nhiệt mùa hè",
    ],
  },
  {
    id: "workplace",
    labelVi: "Công sở & Sự nghiệp",
    labelEn: "Workplace & Career",
    icon: "Briefcase",
    descriptionVi: "Họp hành, dự án, báo cáo tiến độ, đàm phán, xử lý khủng hoảng",
    category: "work",
    sampleSituations: [
      "Đề xuất cắt bớt một tính năng phụ để kịp ngày ra mắt sản phẩm",
      "Xin gia hạn deadline thêm 48 giờ vì bên thứ ba bàn giao API trễ",
      "Đưa ra ý kiến phản biện lịch sự về thiết kế giao diện trong cuộc họp",
      "Nhờ đồng nghiệp bàn giao lại bối cảnh khách hàng trước khi họ nghỉ phép",
      "Báo cáo ngắn gọn nguyên nhân gốc rễ sau khi khắc phục sự cố hệ thống",
      "Từ chối khéo một cuộc họp không có agenda rõ ràng để tập trung chạy sprint",
      "Thuyết phục quản lý phê duyệt ngân sách mua công cụ tự động hóa",
      "Thống nhất quy trình làm việc bất đồng bộ (async) với đội ngũ khác múi giờ",
      "Làm rõ phạm vi công việc (scope) khi khách hàng liên tục yêu cầu thêm ngoài hợp đồng",
      "Động viên thành viên mới trong nhóm sau lần thuyết trình đầu tiên",
    ],
  },
  {
    id: "travel",
    labelVi: "Du lịch & Khách sạn",
    labelEn: "Travel & Hotels",
    icon: "Plane",
    descriptionVi: "Sân bay, khách sạn, hỏi đường, thủ tục vé, xử lý sự cố chuyến đi",
    category: "travel",
    sampleSituations: [
      "Làm thủ tục check-in tại khách sạn và xin đổi sang phòng yên tĩnh xa thang máy",
      "Nhờ nhân viên hãng bay hỗ trợ đổi chuyến nối tiếp vì chuyến đầu bị trễ",
      "Báo thất lạc hành lý ký gửi và mô tả đặc điểm vali tại quầy sân bay",
      "Hỏi chủ nhà Airbnb cách mở khóa thông minh khi mã PIN không hoạt động",
      "Nhờ người bản xứ chỉ tuyến tàu điện nhanh nhất về trung tâm trước giờ đóng cửa",
      "Hỏi nhân viên quầy thuê xe về gói bảo hiểm toàn diện không mức miễn thường",
      "Trình bày lịch trình du lịch và vé khứ hồi với nhân viên hải quan nhập cảnh",
      "Xin hoàn tiền vé tàu cao tốc do lịch trình bị hủy vì thời tiết xấu",
      "Hỏi lễ tân khách sạn chỗ gửi hành lý tạm sau khi trả phòng buổi trưa",
      "Nhờ tài xế taxi dừng lại ở trạm ATM gần nhất trước khi ra sân bay",
    ],
  },
  {
    id: "food_dining",
    labelVi: "Ẩm thực & Nhà hàng",
    labelEn: "Food & Dining",
    icon: "Utensils",
    descriptionVi: "Gọi món, quán cà phê, dị ứng đồ ăn, đặt bàn, thanh toán hóa đơn",
    category: "daily",
    sampleSituations: [
      "Gọi món tại nhà hàng địa phương và hỏi kỹ xem nước sốt có chứa đậu phộng không",
      "Nhờ nhân viên phục vụ đổi lại món bít tết vì bên trong còn quá sống so với yêu cầu",
      "Đặt bàn cho nhóm 6 người vào tối thứ Sáu và xin chỗ ngồi khu vực ngoài trời",
      "Nhờ nhân viên kiểm tra lại hóa đơn vì bị tính nhầm một phần đồ uống",
      "Hỏi barista về loại hạt cà phê ít chua phù hợp để pha cold brew",
      "Yêu cầu tách hóa đơn thanh toán riêng cho từng người trong buổi ăn trưa công ty",
      "Giải thích chế độ ăn hạn chế tinh bột và nhờ đầu bếp gợi ý món thay thế",
      "Hỏi nhân viên tiệm bánh xem món tráng miệng nào không dùng đường tinh luyện",
      "Xin đóng gói phần thức ăn còn dư mang về bằng hộp thân thiện môi trường",
      "Khen ngợi hương vị món đặc sản của quán và hỏi bí quyết gia vị",
    ],
  },
  {
    id: "shopping",
    labelVi: "Mua sắm & Dịch vụ",
    labelEn: "Shopping & Retail",
    icon: "ShoppingBag",
    descriptionVi: "Hỏi size, trả giá, đổi trả hàng, bảo hành, khiếu nại dịch vụ",
    category: "lifestyle",
    sampleSituations: [
      "Hỏi nhân viên xem mẫu áo khoác này còn size vừa ở chi nhánh khác không",
      "Yêu cầu đổi tai nghe mới trong thời hạn bảo hành vì một bên bị rè âm",
      "Thương lượng giảm giá khi mua trọn bộ 3 món đồ thủ công tại chợ địa phương",
      "Liên hệ bộ phận hỗ trợ khách hàng để hủy gói gia hạn tự động vừa bị trừ tiền",
      "Hỏi nhân viên hiệu sách về ấn bản bìa mềm của cuốn sách kinh doanh mới ra",
      "Kiểm tra chính sách hoàn trả trong 30 ngày nếu mua quà tặng nhưng người nhận không vừa",
      "Phàn nàn với bên vận chuyển vì đơn hàng giao thiếu phụ kiện đi kèm",
      "So sánh chi phí bảo dưỡng định kỳ giữa hai dòng máy lọc không khí",
      "Nhờ thợ may chỉnh lại chiều dài ống quần lấy ngay trong chiều nay",
      "Hỏi nhân viên siêu thị vị trí quầy thực phẩm hữu cơ và gia vị nhập khẩu",
    ],
  },
  {
    id: "technology",
    labelVi: "Công nghệ & Kỹ thuật",
    labelEn: "Technology & AI",
    icon: "Laptop",
    descriptionVi: "Phần mềm, sửa lỗi hệ thống, bảo mật, AI, thiết bị thông minh",
    category: "work",
    sampleSituations: [
      "Mô tả lỗi ứng dụng chỉ bị đơ khi người dùng chuyển mạng từ Wi-Fi sang 5G",
      "Thảo luận về cách tích hợp trợ lý AI để tóm tắt biên bản họp tự động",
      "Nhờ bộ phận IT cấp quyền truy cập tạm thời vào môi trường staging để kiểm thử",
      "Giải thích cho khách hàng không chuyên kỹ thuật vì sao cần bật xác thực hai lớp (2FA)",
      "Đề xuất tối ưu hóa truy vấn cơ sở dữ liệu để giảm thời gian tải trang xuống dưới 1 giây",
      "Cảnh báo nhóm phát triển về nguy cơ rò rỉ bộ nhớ (memory leak) khi mở tab lâu",
      "Đánh giá ưu nhược điểm giữa việc tự vận hành mô hình ngôn ngữ nội bộ và dùng Cloud API",
      "Hướng dẫn đồng nghiệp cách khôi phục phiên bản tài liệu bị ghi đè nhầm trên đám mây",
      "Trình bày phương án chuyển đổi hệ thống không gây gián đoạn (zero-downtime migration)",
      "So sánh thời lượng pin và độ bền thực tế của hai dòng laptop làm việc từ xa",
    ],
  },
  {
    id: "social_smalltalk",
    labelVi: "Xã giao & Bạn bè",
    labelEn: "Small Talk & Social",
    icon: "MessageCircle",
    descriptionVi: "Bắt chuyện, kết nối, sở thích, phim ảnh, sự kiện, chia sẻ góc nhìn",
    category: "social",
    sampleSituations: [
      "Bắt chuyện tự nhiên với diễn giả ngay sau phiên thảo luận tại hội nghị công nghệ",
      "Từ chối khéo lời mời đi dự tiệc tối nay vì cần hoàn thành bài thuyết trình sáng mai",
      "Chia sẻ ấn tượng về cú twist bất ngờ trong bộ phim tài liệu vừa xem cuối tuần",
      "Giới thiệu hai người bạn có cùng đam mê nhiếp ảnh làm quen với nhau tại buổi gặp mặt",
      "Hỏi thăm đồng nghiệp nước ngoài về trải nghiệm lần đầu đón Tết tại Việt Nam",
      "Gợi ý chuyển địa điểm dạo phố sang một quán trà yên tĩnh vì trời bắt đầu đổ mưa",
      "Kể lại kỷ niệm hài hước khi cố gắng gọi món bằng ngôn ngữ bản địa lúc đi du lịch",
      "Bày tỏ sự đồng cảm khi bạn thân đang phân vân giữa hai cơ hội nghề nghiệp lớn",
      "Mời đồng nghiệp mới sang ăn trưa cùng nhóm để làm quen môi trường làm việc",
      "Thảo luận sôi nổi về cách giữ sự tập trung trong thời đại quá tải thông báo mạng xã hội",
    ],
  },
  {
    id: "health_fitness",
    labelVi: "Sức khỏe & Thể thao",
    labelEn: "Health & Fitness",
    icon: "HeartPulse",
    descriptionVi: "Khám bác sĩ, triệu chứng, tập luyện, giấc ngủ, dinh dưỡng, cân bằng",
    category: "lifestyle",
    sampleSituations: [
      "Mô tả triệu chứng mỏi cổ vai gáy kéo dài do ngồi máy tính nhiều với bác sĩ vật lý trị liệu",
      "Hỏi huấn luyện viên cách điều chỉnh tư thế squat để không bị đau khớp gối",
      "Nhờ dược sĩ tư vấn loại thuốc dị ứng thời tiết không gây buồn ngủ vào ban ngày",
      "Chia sẻ cách thiết lập giờ giới nghiêm kỹ thuật số (digital detox) 1 tiếng trước khi ngủ",
      "Đặt lịch khám răng định kỳ và xin khung giờ đầu buổi sáng để kịp đi làm",
      "Giải thích với bạn tập về việc giảm cường độ bài chạy hôm nay để cơ bắp hồi phục",
      "Hỏi bác sĩ nhãn khoa về giải pháp giảm mỏi mắt khi làm việc với màn hình liên tục",
      "Từ chối đồ uống có cồn trong buổi tiệc liên hoan vì đang trong giai đoạn luyện giải marathon",
      "Thảo luận về lợi ích của việc đi bộ ngắn 15 phút sau bữa trưa đối với sự tỉnh táo",
      "Hỏi lễ tân phòng khám xem gói bảo hiểm sức khỏe hiện tại có chi trả xét nghiệm này không",
    ],
  },
  {
    id: "interview_career",
    labelVi: "Phỏng vấn & Đàm phán",
    labelEn: "Job Interview & Career",
    icon: "GraduationCap",
    descriptionVi: "Thuyết phục nhà tuyển dụng, xử lý câu hỏi khó, đàm phán lương & thăng tiến",
    category: "work",
    sampleSituations: [
      "Trình bày một dự án thực tế mà bạn đã xoay chuyển tình thế khi nguồn lực bị cắt giảm",
      "Giải thích lý do tìm kiếm thử thách mới theo hướng tích cực, hướng tới tầm ảnh hưởng lớn hơn",
      "Khéo léo đàm phán mức thu nhập tổng (total compensation) dựa trên giá trị mang lại",
      "Đặt câu hỏi sắc sảo cho Giám đốc Kỹ thuật về thước đo thành công trong 90 ngày đầu tiên",
      "Chia sẻ thẳng thắn về một quyết định sai lầm trong quá khứ và quy trình bạn rút ra",
      "Trả lời câu hỏi tình huống: Làm sao khi hai phòng ban có mục tiêu ưu tiên trái ngược nhau?",
      "Đề xuất lộ trình thăng tiến cá nhân gắn liền với mục tiêu mở rộng thị trường của công ty",
      "Thuyết phục hội đồng tuyển dụng rằng khả năng học nhanh giúp bạn bù đắp công nghệ mới",
      "Đàm phán chế độ làm việc linh hoạt 3 ngày tại văn phòng, 2 ngày từ xa mỗi tuần",
      "Tóm tắt ngắn gọn trong 60 giây giá trị cốt lõi khiến bạn khác biệt với các ứng viên khác",
    ],
  },
];

// Expansive 120+ hyper-specific scenario pool for dynamic infinite surprise generation
export const INFINITE_TOPIC_POOL: string[] = [
  // Workplace & Product Engineering (1-25)
  "Explaining why a feature rollout should be staged to 10% of users first to mitigate risk",
  "Politely pushing back on an unrealistic Friday deadline while offering a Monday morning MVP",
  "Asking a senior engineer to pair-program for 20 minutes on a tricky authentication bug",
  "Summarizing the root cause of a checkout latency spike in plain language for executives",
  "Negotiating with a product manager to defer low-impact UI polish until the next sprint",
  "Clarifying ownership of action items at the end of a cross-functional kickoff call",
  "Asking a teammate to cover your on-call shift this Saturday in exchange for next weekend",
  "Giving constructive feedback on a slide deck so the main takeaway stands out immediately",
  "Explaining why automated regression tests will save the team hours of manual QA every release",
  "Informing a client early that a third-party payment gateway outage is delaying sandbox testing",
  "Proposing a 15-minute async video update instead of scheduling another 1-hour status meeting",
  "Asking HR about the reimbursement process for an online professional certification course",
  "Diplomatically addressing scope creep when a stakeholder asks for 'just one small dashboard'",
  "Sharing credit with a junior colleague during an all-hands demo after their crucial fix",
  "Explaining how switching to a modular architecture reduced build times by half",
  "Requesting a quiet focus block in the afternoon to finish deep architectural design",
  "Aligning with marketing on the exact messaging before announcing a pricing tier update",
  "Handling a live demo hiccup gracefully when the staging server takes too long to respond",
  "Convincing leadership to invest one sprint in paying down technical debt before scaling",
  "Onboarding a new international teammate and walking them through the deployment workflow",
  "Mediating a disagreement between design and engineering over mobile animation complexity",
  "Asking your manager for candid feedback on your leadership readiness during a quarterly review",
  "Explaining why user retention matters more than raw sign-ups for the upcoming quarter",
  "Setting clear communication norms for urgent vs. non-urgent messages across time zones",
  "Declining a committee invitation politely to protect time for core deliverables",

  // Travel, Aviation & Hospitality (26-45)
  "Asking a hotel receptionist for a quiet high-floor room away from the elevator shaft",
  "Reporting delayed checked luggage at the airline baggage claim desk with your tracking tag",
  "Negotiating a complimentary late check-out at 2 PM because your evening flight was pushed back",
  "Asking a train station attendant which platform the express train to Kyoto departs from",
  "Explaining to a customs officer that the electronics in your backpack are for personal remote work",
  "Requesting a seat change on a long-haul flight because the reading light and screen are broken",
  "Asking an Airbnb host where the main water valve or circuit breaker is located during a storm",
  "Inquiring at a car rental desk whether cross-border driving is covered under standard insurance",
  "Asking a local passerby for the quickest walking route when GPS signal bounces between tall buildings",
  "Explaining to a hotel concierge that the room key card keeps demagnetizing near your phone",
  "Requesting a tax-free shopping refund form at a department store customer service counter",
  "Asking a tour guide if the coastal boat excursion is still safe given the strong wind forecast",
  "Explaining at a pharmacy abroad that you need blister plasters and electrolyte packets after hiking",
  "Asking a café staff member if there is a power outlet and stable Wi-Fi for a 30-minute video call",
  "Resolving a double-booking confusion calmly at a boutique guesthouse late at night",
  "Asking a museum ticket desk if there is a discounted evening pass for the last two hours",
  "Checking with an Uber driver whether taking the toll bridge will beat the rush-hour gridlock",
  "Asking a ferry operator whether you can exchange a morning ticket for the sunset departure",
  "Explaining to airport security that your medical liquid kit needs manual inspection",
  "Asking a hotel bellhop to store two suitcases for four hours after check-out while you grab lunch",

  // Dining, Coffee & Culinary (46-60)
  "Ordering a flat white with oat milk and asking if their espresso blend is dark or fruity",
  "Politely letting the server know you ordered grilled salmon but received the chicken pasta instead",
  "Asking the chef at a bustling bistro if the mushroom risotto can be prepared without dairy",
  "Calling a popular ramen spot to check if a party of five needs a reservation on a rainy Tuesday",
  "Asking the waiter to split the dinner bill evenly across three cards at the table",
  "Complimenting a local street-food vendor on their crispy pancakes and asking how long they've been open",
  "Asking a bartender to recommend a refreshing non-alcoholic mocktail that isn't overly sweet",
  "Explaining a severe shellfish allergy clearly to ensure separate cooking utensils are used",
  "Asking a bakery clerk which sourdough loaf was baked fresh this morning",
  "Requesting the dressing on the side and extra grilled vegetables for your lunch salad",
  "Asking if the restaurant kitchen is still taking orders 20 minutes before closing time",
  "Recommending your favorite hidden-gem noodle shop to a visiting colleague from London",
  "Politely pointing out an extra appetizer charge on the receipt that never arrived at the table",
  "Asking a specialty tea shop owner about the difference between roasted oolong and matcha grades",
  "Organizing a team farewell lunch and checking everyone's dietary restrictions beforehand",

  // Daily Life, Housing & Errands (61-80)
  "Explaining to your landlord that the air conditioner makes a loud rattling noise every night",
  "Asking a neighbor if they noticed a courier leaving a brown cardboard parcel by the front door",
  "Coordinating with a roommate to switch to a faster fiber-optic internet plan next month",
  "Asking a dry cleaner if they can remove an espresso stain from a linen blazer by Thursday",
  "Explaining to a home repair technician exactly when the kitchen sink started draining slowly",
  "Calling your bank to lift a temporary security freeze after booking international flight tickets",
  "Asking a postal worker for the most reliable tracked shipping option for legal documents",
  "Negotiating a lease renewal with your landlord to keep the monthly rent unchanged for another year",
  "Asking a bike mechanic how long it will take to replace a punctured rear tire and tune the brakes",
  "Setting up a recurring weekend grocery delivery and specifying no plastic bags",
  "Explaining to a delivery driver how to find the side entrance gate using a landmark",
  "Asking a community librarian how to reserve a quiet study pod for Saturday morning",
  "Discussing with your partner how to declutter the living room before guests arrive this weekend",
  "Asking an optician to tighten the loose hinge on your eyeglasses frames",
  "Explaining to a mobile carrier rep that your roaming data package hasn't activated yet",
  "Asking a florist to put together a minimalist bouquet that lasts well in warm weather",
  "Sharing a time-saving Sunday meal-prep routine that keeps weekday evenings stress-free",
  "Asking a building guard where visitors can park their scooters for two hours",
  "Explaining why you prefer repairing quality household items rather than buying cheap replacements",
  "Asking a hardware store clerk which wall anchor can safely hold a heavy bookshelf",

  // Shopping, Consumer Rights & Finance (81-95)
  "Returning a wireless keyboard because the spacebar double-registers every few keystrokes",
  "Asking a store manager for a price match after spotting the exact same monitor on sale online",
  "Negotiating a bundle discount when buying a camera lens together with a tripod at a gear shop",
  "Requesting a pro-rated refund for a cloud software subscription you canceled on the renewal date",
  "Asking a salesperson to explain the real-world difference between two mid-range espresso machines",
  "Checking whether an international warranty covers battery replacement in your home country",
  "Politely declining an aggressive extended-warranty upsell at an electronics checkout counter",
  "Asking a tailor if the shoulders on a suit jacket can be taken in slightly before a wedding",
  "Inquiring at a secondhand vintage market whether the mechanical watch was recently serviced",
  "Explaining to customer support that the replacement item they shipped is still the wrong color",
  "Discussing a practical 50/30/20 monthly budgeting rule with a younger cousin starting their first job",
  "Comparing the long-term cost of owning a compact electric scooter versus using daily ride-hailing",
  "Asking a furniture showroom if they offer assembly service and old-mattress removal",
  "Verifying whether a promotional voucher applies to clearance items before heading to the register",
  "Explaining why you switched to cashback credit cards only for recurring utility bills",

  // Health, Fitness, Social & Modern Lifestyle (96-120)
  "Describing a sharp lower-back twinge after lifting heavy boxes to a physical therapist",
  "Asking a fitness coach for a low-impact cardio alternative while your ankle sprain heals",
  "Explaining to a dentist that your upper molar is sensitive to cold water since last week",
  "Sharing how leaving your phone charging outside the bedroom dramatically improved your sleep quality",
  "Inviting a new acquaintance at a running club to join a casual 5K pace group this Sunday",
  "Politely excusing yourself from a noisy networking reception to catch the last metro home",
  "Debating with friends whether audiobooks count the same as reading physical paper books",
  "Explaining why a 20-minute power nap at lunchtime boosts your afternoon problem-solving focus",
  "Asking a yoga instructor for a wrist-friendly modification during plank poses",
  "Recommending a gripping sci-fi thriller podcast for a friend's long daily commute",
  "Discussing the pros and cons of living in a walkable city center versus a quiet suburb",
  "Congratulating a friend on launching their independent design studio and offering referrals",
  "Explaining how learning a musical instrument as an adult teaches patience and micro-habits",
  "Asking a dermatologist which mineral sunscreen works best under humid tropical weather",
  "Sharing a candid story about a travel mishap that turned into your favorite trip memory",
  "Politely changing the subject at a dinner table when a conversation turns overly tense",
  "Explaining why you prefer small, deep-conversation gatherings over loud crowded parties",
  "Asking a sports store specialist to analyze your foot arch before picking marathon shoes",
  "Discussing how AI translation tools are changing the way people learn foreign languages",
  "Sharing how a simple daily 10-minute stretching routine eliminated your afternoon fatigue",
  "Asking a veterinary clinic what vaccinations are required before boarding a cat for the weekend",
  "Explaining to a friend why you decided to take a 30-day break from short-form video apps",
  "Pitching a weekend charity book-swap event to your neighborhood community group",
  "Describing the atmosphere of an early-morning local market before the city wakes up",
  "Reflecting on the single best piece of career advice a mentor ever gave you",
];

/**
 * Returns a random vivid topic prompt from the infinite pool, optionally avoiding recent prompts
 */
export function getRandomTopicPrompt(excludeRecent?: string[]): string {
  if (excludeRecent && excludeRecent.length > 0) {
    const recentLower = excludeRecent.map((r) => r.toLowerCase());
    const filtered = INFINITE_TOPIC_POOL.filter(
      (item) => !recentLower.some((rec) => rec.includes(item.slice(0, 25).toLowerCase()))
    );
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }
  const index = Math.floor(Math.random() * INFINITE_TOPIC_POOL.length);
  return INFINITE_TOPIC_POOL[index] || "natural spoken English in everyday real life";
}

/**
 * Resolves the topic string to pass into AI prompt generation
 */
export function resolveTopicForPrompt(
  selectedTopicId?: string,
  customTopicTextOrExcludeRecent?: string | string[],
  excludeRecent?: string[]
): string {
  const customTopicText =
    typeof customTopicTextOrExcludeRecent === "string" ? customTopicTextOrExcludeRecent : undefined;
  const effectiveExcludeRecent = Array.isArray(customTopicTextOrExcludeRecent)
    ? customTopicTextOrExcludeRecent
    : excludeRecent;

  if (customTopicText && customTopicText.trim().length > 0) {
    return `custom_scenario: ${customTopicText.trim()}`;
  }

  if (!selectedTopicId || selectedTopicId === "random") {
    return getRandomTopicPrompt(effectiveExcludeRecent);
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
