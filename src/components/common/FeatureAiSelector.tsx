"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettingsStore, ProviderSelectionState } from "@/stores/settings-store";
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
  RefreshCw,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import type { AIModel } from "@/types/ai";

interface Props {
  featureKey: "sentenceBuilder" | "conversation" | "shadowing" | "survivalSpeaking" | "evaluation";
  featureLabel: string;
  onModelChanged?: (provider: string, model: string) => void;
  className?: string;
}

export function FeatureAiSelector({
  featureKey,
  featureLabel,
  onModelChanged,
  className = "",
}: Props) {
  const settings = useSettingsStore();
  const [open, setOpen] = useState(false);

  // Derive current saved config for this feature (or fallback to Settings active engine)
  const getFeatureConfig = useCallback((): ProviderSelectionState => {
    let saved: ProviderSelectionState | undefined;
    if (featureKey === "sentenceBuilder") saved = settings.sentenceBuilderGen;
    else if (featureKey === "conversation") saved = settings.conversation;
    else if (featureKey === "shadowing") saved = settings.shadowing;
    else if (featureKey === "survivalSpeaking") saved = settings.survivalSpeaking;
    else if (featureKey === "evaluation") saved = settings.evaluation;

    const provider = saved?.provider || settings.activeProvider || "gemini";
    const model =
      saved?.model ||
      (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
      "gemini-3.5-flash-lite";

    return { provider, model };
  }, [
    featureKey,
    settings.sentenceBuilderGen,
    settings.conversation,
    settings.shadowing,
    settings.survivalSpeaking,
    settings.evaluation,
    settings.activeProvider,
    settings.preferredGeminiModel,
    settings.preferredGroqModel,
  ]);

  const currentConfig = getFeatureConfig();

  // Dialog draft states
  const [selectedProvider, setSelectedProvider] = useState<string>(currentConfig.provider);
  const [selectedModel, setSelectedModel] = useState<string>(currentConfig.model);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available models whenever provider changes in dialog
  const fetchLiveModels = useCallback(async (provider: string, currentTargetModel?: string) => {
    setLoadingModels(true);
    try {
      const res = await fetch(`/api/ai/models?provider=${provider}&capability=textGeneration&live=true`);
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
        // If current selection is in list keep it, otherwise pick first
        if (currentTargetModel) {
          const match = data.models.find((m: AIModel) => m.id === currentTargetModel);
          if (match) setSelectedModel(match.id);
        }
      }
    } catch {
      // Fallback defaults
      if (provider === "gemini") {
        setModels([
          { id: "gemini-3.5-flash-lite", displayName: "Gemini 3.5 Flash Lite" } as AIModel,
          { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash" } as AIModel,
          { id: "gemini-3.7-flash", displayName: "Gemini 3.7 Flash" } as AIModel,
        ]);
      } else {
        setModels([
          { id: "llama-3.3-70b-versatile", displayName: "Llama 3.3 70B Versatile" } as AIModel,
          { id: "llama-3.1-8b-instant", displayName: "Llama 3.1 8B Instant" } as AIModel,
        ]);
      }
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Sync draft state when opening dialog
  useEffect(() => {
    if (open) {
      const cfg = getFeatureConfig();
      setSelectedProvider(cfg.provider);
      setSelectedModel(cfg.model);
      fetchLiveModels(cfg.provider, cfg.model);
    }
  }, [open]);

  const handleProviderSwitch = (newProv: string) => {
    setSelectedProvider(newProv);
    const defaultM = newProv === "gemini" ? "gemini-3.5-flash-lite" : "llama-3.3-70b-versatile";
    setSelectedModel(defaultM);
    fetchLiveModels(newProv, defaultM);
  };

  const handleSave = () => {
    settings.setFeatureModel(featureKey, { provider: selectedProvider, model: selectedModel });
    toast.success(
      `Đã lưu cấu hình AI cho ${featureLabel}`,
      `Mô hình "${selectedModel}" (${selectedProvider.toUpperCase()}) sẽ được dùng cho các lần sau.`
    );
    if (onModelChanged) {
      onModelChanged(selectedProvider, selectedModel);
    }
    setOpen(false);
  };

  const isGemini = currentConfig.provider === "gemini";

  return (
    <>
      {/* Trigger Pill Badge on Header / Studio bar */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={`h-7 px-2.5 rounded-full text-xs font-mono font-medium gap-1.5 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all btn-spring shadow-2xs ${className}`}
        title={`Bấm để chọn Provider & Model riêng cho ${featureLabel} (Hiện tại: ${currentConfig.model})`}
      >
        <Zap className={`size-3 shrink-0 ${isGemini ? "text-amber-500" : "text-orange-500"}`} />
        <span className="text-muted-foreground hidden sm:inline">
          {isGemini ? "Gemini" : "Groq"}:
        </span>
        <span className="font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
          {currentConfig.model}
        </span>
        <ChevronDown className="size-3 text-muted-foreground ml-0.5 shrink-0" />
      </Button>

      {/* Quick Model Selector Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border border-border/80 shadow-2xl bg-card">
          <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <SlidersHorizontal className="size-3.5" />
              <span>Cấu hình AI chuyên biệt</span>
            </div>
            <DialogTitle className="text-base font-bold">
              Chọn Model cho {featureLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Lựa chọn này được lưu riêng cho {featureLabel}, không làm thay đổi cấu hình của các chức năng khác.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            {/* 1. Provider Tabs */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">1. Nhà cung cấp AI (Provider):</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedProvider === "gemini" ? "secondary" : "outline"}
                  onClick={() => handleProviderSwitch("gemini")}
                  className={`h-10 rounded-xl gap-2 font-semibold text-xs border justify-start px-3 btn-spring ${
                    selectedProvider === "gemini"
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/80"
                  }`}
                >
                  <Sparkles className="size-4 text-primary" />
                  <span>Google Gemini</span>
                </Button>

                <Button
                  type="button"
                  variant={selectedProvider === "groq" ? "secondary" : "outline"}
                  onClick={() => handleProviderSwitch("groq")}
                  className={`h-10 rounded-xl gap-2 font-semibold text-xs border justify-start px-3 btn-spring ${
                    selectedProvider === "groq"
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "border-border/80"
                  }`}
                >
                  <Cpu className="size-4 text-orange-500" />
                  <span>Groq AI (Llama)</span>
                </Button>
              </div>
            </div>

            {/* 2. Model Dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  2. Mô hình AI ({models.length} models):
                </Label>
                {loadingModels && (
                  <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                    <Loader2 className="size-2.5 animate-spin" />
                    <span>Đang tải...</span>
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

              <p className="text-[11px] text-muted-foreground pt-0.5">
                Đang chọn: <span className="font-mono font-bold text-primary">{selectedModel}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
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
                onClick={handleSave}
                className="h-8 rounded-xl text-xs font-semibold gap-1.5 btn-spring"
              >
                <Check className="size-3.5" />
                <span>Lưu & Áp dụng ngay</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
