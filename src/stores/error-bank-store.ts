"use client";

import { create } from "zustand";
import type {
  MasterErrorRecord,
  MainErrorCategory,
  ErrorStatus,
  FossilizationLevel,
  CompactErrorContextPack,
  SpokenDiagnosticReport,
} from "@/types/error-bank";
import {
  getMasterErrorBank,
  flagErrorAsFalsePositive,
  advanceSpacedReviewStage,
  getCompactErrorContextPack,
} from "@/lib/foundation/error-bank/error-bank.service";

interface ErrorBankStoreState {
  records: MasterErrorRecord[];
  selectedCategory: MainErrorCategory | "all";
  selectedStatus: ErrorStatus | "all";
  selectedFossilization: FossilizationLevel | "all";
  dueFilter: "all" | "due_today";
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
  setFossilization: (level: FossilizationLevel | "all") => void;
  setDueFilter: (filter: "all" | "due_today") => void;
  setSearchQuery: (query: string) => void;
  selectRecord: (record: MasterErrorRecord | null) => void;
  flagFalsePositive: (recordId: string) => void;
  advanceReview: (recordId: string, passed: boolean, responseLatencyMs?: number) => void;
  generateDiagnosticReport: () => Promise<void>;
}

export const useErrorBankStore = create<ErrorBankStoreState>((set, get) => ({
  records: [],
  selectedCategory: "all",
  selectedStatus: "all",
  selectedFossilization: "all",
  dueFilter: "all",
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
    const stored = getMasterErrorBank();
    const contextPack = getCompactErrorContextPack();
    set({ records: stored, contextPack });
  },

  setCategory: (category) => set({ selectedCategory: category }),
  setStatus: (status) => set({ selectedStatus: status }),
  setFossilization: (level) => set({ selectedFossilization: level }),
  setDueFilter: (filter) => set({ dueFilter: filter }),
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

  advanceReview: (recordId: string, passed: boolean, responseLatencyMs?: number) => {
    const updated = advanceSpacedReviewStage(recordId, passed, responseLatencyMs);
    const contextPack = getCompactErrorContextPack();
    set({
      records: updated,
      contextPack,
      selectedRecord: updated.find((r) => r.id === recordId) || null,
    });
  },

  generateDiagnosticReport: async () => {
    const { records } = get();
    if (!records.length) {
      throw new Error("Ngân hàng lỗi đang trống. Hãy thực hành nói để thu thập lỗi trước khi chẩn đoán.");
    }
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
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Không thể khởi tạo báo cáo chẩn đoán");
      }
      if (data.report) {
        set({ diagnosticReport: data.report, isDiagnosing: false });
      } else {
        set({ isDiagnosing: false });
      }
    } catch (err) {
      set({ isDiagnosing: false });
      throw err;
    }
  },
}));
