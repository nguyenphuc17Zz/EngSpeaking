// Spoken Diagnostic & Prescription Service — AI Bác Sĩ Khẩu Ngữ (Function 5)
// Deep longitudinal analysis of error patterns, L1 interference, and retrieval gaps

import { generateTextWithRouting } from "@/lib/ai";
import { spokenDiagnosticReportSchema } from "@/lib/validation/error-bank-schemas";
import type { MasterErrorRecord, SpokenDiagnosticReport } from "@/types/error-bank";

export interface GenerateDiagnosticOptions {
  records: MasterErrorRecord[];
  provider?: string;
  model?: string;
}

const SPOKEN_DIAGNOSTIC_SYSTEM = `You are the Head Spoken Language Pathologist and Expert English Speaking Coach.
Analyze the user's longitudinal speaking error records from their Personal Error Bank.
The user is a Vietnamese English learner.

CRITICAL PEDAGOGICAL INSIGHTS:
1. Distinguish between KNOWLEDGE GAP (user doesn't know grammar rule) and RETRIEVAL GAP (user knows grammar on paper, but under 2-3s time pressure speech fails to retrieve). For Vietnamese adults, Retrieval Gap is typically 70-85%.
2. Identify L1 INTERFERENCE (Vietnamese thinking patterns directly translated into English, e.g. "I very like", "open the light", "wait me a minute", "yesterday I go").
3. Prescribe 3 concrete, high-leverage 7-day actions targeted at our app modules:
   - "retry_lab" (Spoken Repair Lab: Correct -> Say Again)
   - "latency" (Response Latency Speed Gym: Bật câu dưới 2.0s)
   - "sentence_builder" (Sentence Builder: Khung ngữ pháp có giàn giáo)
   - "vn_to_en" (VN -> EN Speaking: Phản xạ dịch xuôi tự nhiên)

OUTPUT STRICT JSON ONLY. NO MARKDOWN FORMATTING:
{
  "id": string,
  "generatedAt": string,
  "primaryBottleneckVi": string,
  "retrievalVsKnowledgeRatio": {
    "retrievalGapPercent": number (e.g. 80),
    "knowledgeGapPercent": number (e.g. 20),
    "explanationVi": string
  },
  "l1InterferencePatterns": [
    {
      "vietnameseHabit": string (e.g. "Dịch thô 'Tôi rất thích...' thành 'I very like...'"),
      "naturalEnglishAlternative": string (e.g. "I really like... / I'm really into..."),
      "explanationVi": string
    }
  ],
  "prescriptions": [
    {
      "id": "rx_1",
      "titleVi": string,
      "actionDescriptionVi": string,
      "targetModule": "retry_lab" | "latency" | "sentence_builder" | "vn_to_en",
      "dailyMinutes": number
    }
  ],
  "motivationalQuoteVi": string
}`;

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export function computeDeterministicDiagnostic(records: MasterErrorRecord[]): SpokenDiagnosticReport {
  const totalOccurrences = records.reduce((acc, r) => acc + (r.frequency || 1), 0);
  const retrievalCount = records.filter((r) => r.gapType === "retrieval_gap" || r.averageLatencyMs > 3000).length;
  const retrievalPercent = records.length > 0 ? Math.min(90, Math.max(60, Math.round((retrievalCount / records.length) * 100))) : 80;
  const knowledgePercent = 100 - retrievalPercent;

  const topPersistent = records.find((r) => r.status === "persistent" || r.frequency > 2);

  return {
    id: `diag_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    primaryBottleneckVi: topPersistent
      ? `Điểm nghẽn lớn nhất: Thói quen lặp lại ở "${topPersistent.labelVi}". Kiến thức lý thuyết tốt nhưng tốc độ truy xuất tự động (Spoken Retrieval) chưa bắt kịp ý nghĩ.`
      : "Vùng vận động khẩu ngữ bị nghẽn ở các thì quá khứ và phản xạ dịch thô nguyên từ từ tiếng Việt.",
    retrievalVsKnowledgeRatio: {
      retrievalGapPercent: retrievalPercent,
      knowledgeGapPercent: knowledgePercent,
      explanationVi: `80% lỗi xuất phát từ độ trễ truy xuất phản xạ dưới áp lực nói nhanh (Retrieval Gap), không phải do bạn chưa biết ngữ pháp. Hãy tập trung luyện phản xạ câu ngắn thay vì học thêm lý thuyết.`,
    },
    l1InterferencePatterns: [
      {
        vietnameseHabit: "Dịch thô thói quen không biến đổi động từ quá khứ trong tiếng Việt ('hôm qua tôi đi...' -> 'yesterday I go...')",
        naturalEnglishAlternative: "Yesterday, I went... (gắn phản xạ quá khứ đơn theo cụm)",
        explanationVi: "Tiếng Việt không chia thì động từ, não bộ có xu hướng giữ nguyên động từ nguyên mẫu khi nói nhanh.",
      },
      {
        vietnameseHabit: "Dịch từng từ 'Tôi rất thích' thành 'I very like...'",
        naturalEnglishAlternative: "I really like... / I'm big on...",
        explanationVi: "Trong tiếng Anh 'very' không trực tiếp bổ nghĩa cho động từ thường.",
      },
    ],
    prescriptions: [
      {
        id: "rx_1",
        titleVi: "Chữa phản xạ ngập ngừng với Response Latency Gym",
        actionDescriptionVi: "Luyện 10 câu ở chế độ Rapid Retrieval để ép thời gian bật câu xuống dưới 2.0s mỗi ngày.",
        targetModule: "latency",
        dailyMinutes: 10,
      },
      {
        id: "rx_2",
        titleVi: "Xóa sổ lỗi tái phát tại Spoken Repair Lab",
        actionDescriptionVi: "Thực hành chu trình Correct -> Say Again để miệng quen với câu chuẩn bản ngữ ngay lập tức.",
        targetModule: "retry_lab",
        dailyMinutes: 10,
      },
      {
        id: "rx_3",
        titleVi: "Tập tư duy cụm từ (Collocations) với VN -> EN",
        actionDescriptionVi: "Chuyển dịch ý tưởng tiếng Việt sang các cụm từ bản ngữ (Collocations) thay vì dịch từng từ.",
        targetModule: "vn_to_en",
        dailyMinutes: 10,
      },
    ],
    motivationalQuoteVi: "Độ trôi chảy không đến từ việc biết nhiều từ vựng hơn, mà đến từ việc bật ra những từ quen thuộc trong thời gian ngắn hơn!",
  };
}

export async function generateSpokenDiagnosticReport(
  options: GenerateDiagnosticOptions
): Promise<SpokenDiagnosticReport> {
  const { records, provider = "gemini", model = "auto" } = options;

  if (provider === "mock" || records.length === 0) {
    return computeDeterministicDiagnostic(records);
  }

  const summarizedRecords = records.slice(0, 15).map((r) => ({
    labelVi: r.labelVi,
    category: r.category,
    frequency: r.frequency,
    recoveryRate: r.recoveryRate,
    status: r.status,
    averageLatencyMs: r.averageLatencyMs,
    sampleUserText: r.examples[0]?.userText,
    sampleCorrection: r.examples[0]?.correction,
  }));

  const userPrompt = `Dưới đây là dữ liệu hồ sơ lỗi khẩu ngữ thực tế của người học (${records.length} mẫu lỗi):
${JSON.stringify(summarizedRecords, null, 2)}

Hãy đóng vai Bác sĩ Khẩu ngữ AI, chẩn đoán chính xác nguyên nhân gốc rễ và kê đơn lộ trình cải thiện phản xạ tiếng Anh 7 ngày. Trả về JSON theo đúng định dạng.`;

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: SPOKEN_DIAGNOSTIC_SYSTEM,
        temperature: 0.4,
        maxOutputTokens: 900,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Không thể phân tích phản hồi từ AI");
    }

    if (!parsed.id) {
      parsed.id = `diag_${Date.now()}`;
    }
    if (!parsed.generatedAt) {
      parsed.generatedAt = new Date().toISOString();
    }

    const validated = spokenDiagnosticReportSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[DiagnosticService] Schema error:", validated.error);
      return computeDeterministicDiagnostic(records);
    }

    return validated.data as SpokenDiagnosticReport;
  } catch (err) {
    console.warn("[DiagnosticService] AI call error, falling back to clinical deterministic:", err);
    return computeDeterministicDiagnostic(records);
  }
}
