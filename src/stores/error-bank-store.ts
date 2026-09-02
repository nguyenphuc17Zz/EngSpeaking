"use client";

import { create } from "zustand";
import type {
  MasterErrorRecord,
  MainErrorCategory,
  ErrorStatus,
  CompactErrorContextPack,
  SpokenDiagnosticReport,
} from "@/types/error-bank";
import {
  getMasterErrorBank,
  ingestErrorOccurrence,
  flagErrorAsFalsePositive,
  advanceSpacedReviewStage,
  getCompactErrorContextPack,
} from "@/lib/foundation/error-bank/error-bank.service";

interface ErrorBankStoreState {
  records: MasterErrorRecord[];
  selectedCategory: MainErrorCategory | "all";
  selectedStatus: ErrorStatus | "all";
  searchQuery: string;
  selectedRecord: MasterErrorRecord | null;
  contextPack: CompactErrorContextPack;
  isLoading: boolean;
  diagnosticReport: SpokenDiagnosticReport | null;
  isDiagnosing: boolean;

  // Actions
  loadLocalRecords: () => void;
  setCategory: (category: MainErrorCategory | "all") => void;
  setStatus: (status: ErrorStatus | "all") => void;
  setSearchQuery: (query: string) => void;
  selectRecord: (record: MasterErrorRecord | null) => void;
  flagFalsePositive: (recordId: string) => void;
  advanceReview: (recordId: string, passed: boolean) => void;
  generateDiagnosticReport: () => Promise<void>;
}

const DEFAULT_MOCK_ERRORS: Parameters<typeof ingestErrorOccurrence>[0][] = [
  {
    patternKey: "past_simple_base_form",
    canonicalName: "Past Simple base form used instead of V2",
    category: "grammar",
    labelVi: "Động từ quá khứ đơn (went / saw / ate)",
    descriptionVi: "Dùng nhầm động từ nguyên mẫu khi diễn tả sự việc đã kết thúc trong quá khứ.",
    userText: "Yesterday I go to the supermarket.",
    correction: "Yesterday I went to the supermarket.",
    contextSentence: "Talking about grocery shopping yesterday",
    sourceModule: "sentence_builder",
    responseLatencyMs: 4600,
    wasRetried: true,
    retrySucceeded: true,
    severity: "major",
  },
  {
    patternKey: "collocation_depend_on",
    canonicalName: "Collocation: depend on vs depend of",
    category: "vocabulary",
    labelVi: "Giới từ đi kèm động từ (depend on)",
    descriptionVi: "Dùng nhầm 'depend of' thay vì cụm chuẩn 'depend on'.",
    userText: "It depends of the weather.",
    correction: "It depends on the weather.",
    sourceModule: "vn_to_en",
    responseLatencyMs: 3800,
    wasRetried: true,
    retrySucceeded: true,
    severity: "moderate",
  },
  {
    patternKey: "ending_sound_ed",
    canonicalName: "Ending sound /t/, /d/, /id/ in past verbs",
    category: "pronunciation",
    labelVi: "Phát âm đuôi -ed (/t/, /d/, /ɪd/)",
    descriptionVi: "Bỏ quên âm đuôi khi phát âm động từ có quy tắc trong quá khứ.",
    userText: "I work yesterday.",
    correction: "I worked (/wɜːrkt/) yesterday.",
    sourceModule: "shadowing",
    responseLatencyMs: 2500,
    wasRetried: true,
    retrySucceeded: true,
    severity: "major",
  },
  {
    patternKey: "retrieval_delay_opinions",
    canonicalName: "Spoken Response Latency Delay (>4.0s)",
    category: "fluency",
    labelVi: "Độ trễ truy xuất câu nêu quan điểm (>4.0s)",
    descriptionVi: "Mất nhiều thời gian suy nghĩ cấu trúc câu trước khi bắt đầu nói.",
    userText: "Um, I think that, uh, remote work is good.",
    correction: "In my opinion, remote work is very convenient.",
    sourceModule: "latency",
    responseLatencyMs: 5200,
    wasRetried: false,
    retrySucceeded: false,
    severity: "moderate",
  },
];

export const useErrorBankStore = create<ErrorBankStoreState>((set, get) => ({
  records: [],
  selectedCategory: "all",
  selectedStatus: "all",
  searchQuery: "",
  selectedRecord: null,
  contextPack: {
    topWeaknesses: [],
    reviewDueList: [],
    overallRecoveryRate: 85,
    totalActiveErrors: 0,
  },
  isLoading: false,
  diagnosticReport: null,
  isDiagnosing: false,

  loadLocalRecords: () => {
    let stored = getMasterErrorBank();
    if (stored.length === 0) {
      // Seed initial high-value sample errors so the dashboard is immediately rich & actionable
      DEFAULT_MOCK_ERRORS.forEach((item) => ingestErrorOccurrence(item));
      stored = getMasterErrorBank();
    }

    const contextPack = getCompactErrorContextPack();
    set({ records: stored, contextPack });
  },

  setCategory: (category) => set({ selectedCategory: category }),
  setStatus: (status) => set({ selectedStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectRecord: (record) => set({ selectedRecord: record }),

  flagFalsePositive: (recordId: string) => {
    const updated = flagErrorAsFalsePositive(recordId);
    const contextPack = getCompactErrorContextPack();
    set({
      records: updated,
      contextPack,
      selectedRecord: updated.find((r) => r.id === recordId) || null,
    });
  },

  advanceReview: (recordId: string, passed: boolean) => {
    const updated = advanceSpacedReviewStage(recordId, passed);
    const contextPack = getCompactErrorContextPack();
    set({
      records: updated,
      contextPack,
      selectedRecord: updated.find((r) => r.id === recordId) || null,
    });
  },

  generateDiagnosticReport: async () => {
    const { records } = get();
    set({ isDiagnosing: true });

    let provider = "gemini";
    let model = "auto";
    try {
      const { useSettingsStore } = await import("@/stores/settings-store");
      const settings = useSettingsStore.getState();
      provider = settings.generation?.provider || settings.activeProvider || "gemini";
      model =
        settings.generation?.model ||
        (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
        "auto";
    } catch {}

    try {
      const res = await fetch("/api/foundation/error-bank/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, provider, model }),
      });
      const data = await res.json();
      if (data.report) {
        set({ diagnosticReport: data.report, isDiagnosing: false });
      } else {
        set({ isDiagnosing: false });
      }
    } catch {
      set({ isDiagnosing: false });
    }
  },
}));
