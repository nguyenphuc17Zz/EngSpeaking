// Soft prerequisite gate: Advanced reads Sentence Builder + VN→EN mastery to recommend L1/L2/L3
// Never hard-blocks — always allowed, but explains what foundation is missing.

import type {
  AdvancedLevel,
  AdvancedPrerequisiteCheck,
  AdvancedPrerequisiteInput,
} from "@/types/advanced";

export function checkAdvancedPrerequisite(
  requestedLevel: AdvancedLevel,
  input: AdvancedPrerequisiteInput = {}
): AdvancedPrerequisiteCheck {
  const sbMastery = input.sbMastery ?? 0;
  const sbIndependence = input.sbIndependence ?? 0;
  const vnRate = input.vnIndependentRate ?? 0;
  const vnAcc = input.vnAccuracy ?? 0;

  const hasData = sbMastery > 0 || vnRate > 0 || vnAcc > 0;

  // Recommend based on foundation strength
  let recommendedLevel: AdvancedLevel = "L1";
  if (sbMastery >= 70 && (vnRate >= 60 || vnAcc >= 75)) {
    recommendedLevel = "L3";
  } else if (sbMastery >= 55 || vnRate >= 45 || vnAcc >= 65) {
    recommendedLevel = "L2";
  }

  const order: AdvancedLevel[] = ["L1", "L2", "L3"];
  const reasons: string[] = [];
  const missing: string[] = [];

  if (!hasData) {
    reasons.push("Chưa có dữ liệu Sentence Builder / VN→EN — bắt đầu từ L1 để làm quen khung Toulmin cơ bản.");
    return {
      allowed: true,
      recommendedLevel: "L1",
      reasons,
      missing: ["Hãy luyện 5–10 câu Sentence Builder trước để mở khóa gợi ý chính xác hơn."],
    };
  }

  if (requestedLevel === "L1") {
    reasons.push(`L1 phù hợp để khởi động (SB mastery ${sbMastery}%, VN tự lập ${vnRate}%).`);
    return { allowed: true, recommendedLevel, reasons, missing };
  }

  if (requestedLevel === "L2") {
    if (recommendedLevel === "L1") {
      missing.push(`Cần SB mastery ≥55% (hiện ${sbMastery}%) hoặc VN tự lập ≥45% (hiện ${vnRate}%).`);
      reasons.push("Bạn vẫn có thể vào L2, nhưng scaffold sẽ nặng hơn và prep +0.5s để hỗ trợ.");
    } else {
      reasons.push("Đủ nền tảng cho L2 bán tự do (keywords + constraints).");
    }
    return { allowed: true, recommendedLevel, reasons, missing };
  }

  // L3
  if (order.indexOf(recommendedLevel) < 2) {
    if (sbMastery < 70) missing.push(`SB mastery ${sbMastery}% < 70% — hãy luyện thêm Sentence Builder trước.`);
    if (sbIndependence > 0 && sbIndependence < 60)
      missing.push(`SB independence ${sbIndependence}% còn thấp — hạn chế dùng hint T3/T4.`);
    if (vnRate < 60 && vnAcc < 75)
      missing.push(`VN→EN tự lập ${vnRate}% / chính xác ${vnAcc}% — cần phản xạ <2.5s ổn định hơn.`);
    reasons.push("L3 yêu cầu lập luận full Toulmin dưới blitz 3–4s. Bạn vẫn có thể thử, hệ thống sẽ tự hạ prep nếu hụt hơi.");
  } else {
    reasons.push("Nền tảng vững — sẵn sàng cho L3 tự do + fallacy/bridging.");
  }
  return { allowed: true, recommendedLevel, reasons, missing };
}
