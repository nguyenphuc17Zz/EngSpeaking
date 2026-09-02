"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
  Zap,
  Sparkles,
  Cpu,
  ChevronDown,
  Check,
  Loader2,
  SlidersHorizontal,
  Activity,
  Globe,
} from "lucide-react";
import type { AIModel } from "@/types/ai";

interface Props {
  className?: string;
  size?: "sm" | "default";
}

export function GlobalAiSelector({ className = "", size = "default" }: Props) {
  const settings = useSettingsStore();
  const [open, setOpen] = useState(false);

  // Active engine in store
  const activeProvider = settings.activeProvider || "gemini";
  const activeModel =
    activeProvider === "gemini"
      ? settings.preferredGeminiModel || "gemini-3.5-flash-lite"
      : settings.preferredGroqModel || "llama-3.3-70b-versatile";

  // Draft states inside dialog
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "groq">(activeProvider);
  const [selectedModel, setSelectedModel] = useState<string>(activeModel);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; latencyMs?: number; message?: string } | null>(null);

  // Fetch available live models for chosen provider (zero dependency loop)
  const fetchLiveModels = useCallback(async (provider: string, currentTargetModel?: string) => {
    setLoadingModels(true);
    setPingResult(null);
    try {
      const res = await fetch(`/api/ai/models?provider=${provider}&capability=textGeneration&live=true`);
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        // Prioritize gemini-3.5-flash-lite and llama-3.3-70b-versatile at the top
        const prioritized = [...data.models].sort((a: AIModel, b: AIModel) => {
          if (a.id === "gemini-3.5-flash-lite" || a.id === "llama-3.3-70b-versatile") return -1;
          if (b.id === "gemini-3.5-flash-lite" || b.id === "llama-3.3-70b-versatile") return 1;
          if (a.id === "gemini-3.7-flash") return -1;
          if (b.id === "gemini-3.7-flash") return 1;
          return 0;
        });
        setModels(prioritized);

        // If target model was passed and exists, keep it
        if (currentTargetModel) {
          const match = prioritized.find((m: AIModel) => m.id === currentTargetModel);
          if (match) {
            setSelectedModel(match.id);
          }
        }
      } else {
        throw new Error("No models returned");
      }
    } catch {
      // Offline fallback models
      if (provider === "gemini") {
        setModels([
          { id: "gemini-3.5-flash-lite", displayName: "Gemini 3.5 Flash Lite (Siêu tốc - Khuyên dùng)" } as AIModel,
          { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash (Cân bằng)" } as AIModel,
          { id: "gemini-3.7-flash", displayName: "Gemini 3.7 Flash (Chất lượng cao)" } as AIModel,
        ]);
      } else {
        setModels([
          { id: "llama-3.3-70b-versatile", displayName: "Llama 3.3 70B Versatile (Thông minh - Khuyên dùng)" } as AIModel,
          { id: "llama-3.1-8b-instant", displayName: "Llama 3.1 8B Instant (Tốc độ)" } as AIModel,
        ]);
      }
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Sync draft state ONLY when modal is opened (strictly zero re-runs on select change)
  useEffect(() => {
    if (open) {
      const currentProv = settings.activeProvider || "gemini";
      const currentM =
        currentProv === "gemini"
          ? settings.preferredGeminiModel || "gemini-3.5-flash-lite"
          : settings.preferredGroqModel || "llama-3.3-70b-versatile";
      setSelectedProvider(currentProv);
      setSelectedModel(currentM);
      fetchLiveModels(currentProv, currentM);
    }
  }, [open]);

  const handleProviderSwitch = (newProv: "gemini" | "groq") => {
    setSelectedProvider(newProv);
    const m = newProv === "gemini" ? settings.preferredGeminiModel : settings.preferredGroqModel;
    setSelectedModel(m);
    fetchLiveModels(newProv, m);
  };

  // Ping test selected provider
  const handleTestLatency = async () => {
    setPingTesting(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/ai/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const data = await res.json();
      if (data.success) {
        setPingResult({
          ok: true,
          latencyMs: data.latencyMs,
          message: `Kết nối tốt! Độ trễ: ${data.latencyMs}ms (${data.modelsCount} models sẵn sàng)`,
        });
      } else {
        setPingResult({
          ok: false,
          message: data.error || "Không thể kết nối hoặc Key hết hạn mức.",
        });
      }
    } catch (e: unknown) {
      setPingResult({
        ok: false,
        message: e instanceof Error ? e.message : "Lỗi kiểm tra kết nối.",
      });
    } finally {
      setPingTesting(false);
    }
  };

  // Apply to ALL features in the app atomically
  const handleApplyGlobal = () => {
    // Atomically set provider, preferred models, and all 8 task models
    settings.applyProviderToAll(selectedProvider, selectedModel);

    toast.success(
      `Đã chuyển Động cơ AI sang ${selectedProvider.toUpperCase()}`,
      `Tất cả chức năng hiện đang chạy trên "${selectedModel}".`
    );

    setOpen(false);
  };

  const isGemini = activeProvider === "gemini";

  return (
    <>
      {/* Universal Trigger Button on Header */}
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={() => setOpen(true)}
        className={`rounded-full h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-mono font-medium border-border/80 hover:border-primary/40 hover:bg-primary/5 btn-spring shadow-2xs text-muted-foreground hover:text-foreground ${className}`}
        title={`Động cơ AI toàn hệ thống: ${activeProvider.toUpperCase()} (${activeModel}) - Bấm để chuyển đổi`}
        aria-label="Chuyển đổi Động cơ AI toàn hệ thống"
      >
        <Zap className={`size-3.5 shrink-0 ${isGemini ? "text-amber-500" : "text-orange-500"}`} />
        <span className="font-semibold text-foreground hidden md:inline">
          {isGemini ? "Gemini" : "Groq"}:
        </span>
        <span className="font-bold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
          {activeModel}
        </span>
        <ChevronDown className="size-3 text-muted-foreground ml-0.5 shrink-0" />
      </Button>

      {/* Global AI Engine Switcher Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border border-border/80 shadow-2xl bg-card">
          <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Globe className="size-3.5" />
              <span>Động cơ AI toàn hệ thống</span>
            </div>
            <DialogTitle className="text-base font-bold">
              Chuyển đổi AI Engine & Model
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Áp dụng đồng bộ cho tất cả tính năng: Sentence Builder, Hội thoại, Luyện Shadowing, Chẩn đoán và Voice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            {/* 1. Provider Cards */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">1. Chọn Nhà cung cấp AI:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedProvider === "gemini" ? "secondary" : "outline"}
                  onClick={() => handleProviderSwitch("gemini")}
                  className={`h-11 rounded-2xl gap-2 font-semibold text-xs border justify-start px-3 btn-spring ${
                    selectedProvider === "gemini"
                      ? "border-primary/60 bg-primary/10 text-primary shadow-xs"
                      : "border-border/80"
                  }`}
                >
                  <Sparkles className="size-4 text-primary" />
                  <div className="text-left">
                    <div className="font-bold">Google Gemini</div>
                    <div className="text-[10px] font-normal text-muted-foreground">3.5 Lite, 3.6, 3.7</div>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant={selectedProvider === "groq" ? "secondary" : "outline"}
                  onClick={() => handleProviderSwitch("groq")}
                  className={`h-11 rounded-2xl gap-2 font-semibold text-xs border justify-start px-3 btn-spring ${
                    selectedProvider === "groq"
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-xs"
                      : "border-border/80"
                  }`}
                >
                  <Cpu className="size-4 text-orange-500" />
                  <div className="text-left">
                    <div className="font-bold">Groq AI</div>
                    <div className="text-[10px] font-normal text-muted-foreground">Llama 3.3 70B Versatile</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* 2. Model Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  2. Chọn Mô hình ({models.length} options):
                </Label>
                {loadingModels && (
                  <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                    <Loader2 className="size-2.5 animate-spin" />
                    <span>Đang quét...</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={loadingModels}
                  className="w-full h-10 rounded-xl bg-background border border-input px-3 pr-8 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName || m.id}
                    </option>
                  ))}
                  {selectedModel && !models.some((m) => m.id === selectedModel) && (
                    <option value={selectedModel}>{selectedModel}</option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>

              {/* Ping Connection Button & Latency readout */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleTestLatency}
                  disabled={pingTesting}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1 rounded-lg"
                >
                  <Activity className="size-3 text-emerald-500" />
                  <span>{pingTesting ? "Đang đo kết nối..." : "Kiểm tra độ trễ"}</span>
                </Button>

                {pingResult && (
                  <span
                    className={`text-[10px] font-mono font-medium ${
                      pingResult.ok ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {pingResult.message}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyGlobal}
                className="h-8 rounded-xl text-xs font-bold gap-1.5 btn-spring shadow-xs"
              >
                <Check className="size-3.5" />
                <span>Áp dụng cho toàn bộ ứng dụng</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
