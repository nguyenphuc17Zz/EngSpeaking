"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AIModel } from "@/types/ai";
import { RefreshCw, Sparkles, Edit3, Check, Loader2, ChevronDown, CheckCircle2 } from "lucide-react";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";

interface Props {
  label: string;
  description?: string;
  providerValue: string;
  modelValue: string;
  capability: "textGeneration" | "speechToText" | "textToSpeech";
  onChange: (provider: string, model: string) => void;
}

const STT_PROVIDERS = [
  { id: "auto", label: "Tự động (Whisper ONNX / Groq / Browser)" },
  { id: "whisper-local", label: "Whisper ONNX (Offline trong models/)" },
  { id: "groq", label: "Groq (Whisper Large V3 - Chuẩn xác cao)" },
  { id: "browser", label: "Trình duyệt (Web Speech API - Miễn phí)" },
  { id: "mock", label: "Mock (Testing)" },
];

const TTS_PROVIDERS = [
  { id: "auto", label: "Tự động (Edge Neural / Kokoro / Browser)" },
  { id: "edge-tts", label: "Microsoft Edge Neural (Online - Chuẩn bản xứ)" },
  { id: "kokoro-tts", label: "Kokoro-82M TTS (Offline trong models/)" },
  { id: "browser", label: "Trình duyệt (SpeechSynthesis - Offline)" },
  { id: "mock", label: "Mock (Testing)" },
];

const TEXT_GEN_PROVIDERS = [
  { id: "auto", label: "Tự động (Auto AI Router)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "groq", label: "Groq (Llama 3.3)" },
  { id: "mock", label: "Mock (Testing)" },
];

export function ModelSelector({
  label,
  description,
  providerValue,
  modelValue,
  capability,
  onChange,
}: Props) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customModelText, setCustomModelText] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  // Lọc danh sách provider theo đúng capability
  const availableProviders = useMemo(() => {
    if (capability === "speechToText") return STT_PROVIDERS;
    if (capability === "textToSpeech") return TTS_PROVIDERS;
    return TEXT_GEN_PROVIDERS;
  }, [capability]);

  // Tự động chuẩn hoá fallback nếu providerValue hiện tại không hợp lệ với capability
  useEffect(() => {
    const isSupported = availableProviders.some((p) => p.id === providerValue);
    if (!isSupported && availableProviders.length > 0) {
      const fallback = capability === "speechToText" ? "whisper-local" : (capability === "textToSpeech" ? "edge-tts" : "auto");
      onChange(fallback, "auto");
    }
  }, [availableProviders, providerValue, capability, onChange]);

  const fetchLiveModels = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/ai/models?provider=${providerValue}&capability=${capability}`
      );
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length) {
        setModels(data.models);
      }
    } catch {}
    finally {
      setIsRefreshing(false);
      setHasFetched(true);
    }
  }, [providerValue, capability]);

  useEffect(() => {
    fetchLiveModels();
  }, [fetchLiveModels]);

  // Nhãn hiển thị cho trạng thái Đang Áp Dụng
  const currentProviderLabel = useMemo(() => {
    const found = availableProviders.find((p) => p.id === providerValue);
    if (!found) return providerValue;
    if (providerValue === "edge-tts") return "Edge Neural";
    if (providerValue === "kokoro-tts") return "Kokoro-82M";
    if (providerValue === "whisper-local" || providerValue === "whisper-onnx") return "Whisper ONNX";
    if (providerValue === "browser") return "Browser";
    if (providerValue === "gemini") return "Gemini";
    if (providerValue === "groq") return "Groq";
    if (providerValue === "auto") return "Auto Router";
    return found.label.split("(")[0].trim();
  }, [availableProviders, providerValue]);

  const currentModelLabel = useMemo(() => {
    if (!modelValue || modelValue === "auto") return "Tự động";
    const found = models.find((m) => m.id === modelValue);
    return found?.displayName || modelValue;
  }, [modelValue, models]);

  // Group models by provider for optgroup display
  const edgeModels = models.filter((m) => m.providerId === "edge-tts");
  const kokoroModels = models.filter((m) => m.providerId === "kokoro-tts" || m.providerId === "kokoro");
  const whisperModels = models.filter((m) => m.providerId === "whisper-local" || m.providerId === "whisper-onnx");
  const geminiModels = models.filter((m) => m.providerId === "gemini");
  const groqModels = models.filter((m) => m.providerId === "groq");
  const browserModels = models.filter((m) => m.providerId === "browser");
  const mockModels = models.filter((m) => m.providerId === "mock");

  // Determine current provider models
  const currentProviderModels =
    providerValue === "auto"
      ? models
      : models.filter((m) => m.providerId === providerValue);

  const modelOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = [
      { value: "auto", label: "⚡ Tự động (Auto AI Router)" },
    ];

    if (providerValue === "auto") {
      if (capability === "textToSpeech" && edgeModels.length > 0) {
        edgeModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Microsoft Edge Neural Voices (Online SOTA)",
          })
        );
      }

      if (capability === "textToSpeech" && kokoroModels.length > 0) {
        kokoroModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Kokoro-82M TTS (Offline trong models/)",
          })
        );
      }

      if (capability === "textGeneration" && geminiModels.length > 0) {
        geminiModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Google Gemini Models (Live API)",
          })
        );
      }

      if (capability === "speechToText" && whisperModels.length > 0) {
        whisperModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Whisper ONNX (Offline trong models/)",
          })
        );
      }

      if ((capability === "textGeneration" || capability === "speechToText") && groqModels.length > 0) {
        groqModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Groq Models (Live API)",
          })
        );
      }

      if ((capability === "textToSpeech" || capability === "speechToText") && browserModels.length > 0) {
        browserModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Trình duyệt (Browser)",
          })
        );
      }

      if (mockModels.length > 0) {
        mockModels.forEach((m) =>
          list.push({
            value: m.id,
            label: m.displayName || m.id,
            group: "Mock (Testing)",
          })
        );
      }
    } else {
      currentProviderModels.forEach((m) => {
        list.push({
          value: m.id,
          label: m.displayName || m.id,
        });
      });
    }

    if (
      modelValue &&
      modelValue !== "auto" &&
      !list.some((opt) => opt.value === modelValue)
    ) {
      list.push({
        value: modelValue,
        label: `${modelValue} (Custom)`,
      });
    }

    return list;
  }, [
    providerValue,
    capability,
    edgeModels,
    kokoroModels,
    geminiModels,
    whisperModels,
    groqModels,
    browserModels,
    mockModels,
    currentProviderModels,
    modelValue,
  ]);

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
      {/* Header with Title, In-use badge and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">
              {label}
            </h3>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] py-0 px-2 h-5 font-mono font-medium gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Đang áp dụng: <strong>{currentProviderLabel}</strong> ({currentModelLabel})</span>
            </Badge>
            {currentProviderModels.length > 0 && providerValue !== "auto" && (
              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-2 h-5">
                {currentProviderModels.length} models
              </Badge>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchLiveModels}
            disabled={isRefreshing}
            className="h-8 gap-1.5 rounded-xl text-xs font-semibold px-2.5"
            title="Gọi API lấy danh sách models mới nhất từ Provider"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Làm mới Models</span>
          </Button>

          <Button
            type="button"
            variant={isCustomMode ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => {
              setIsCustomMode(!isCustomMode);
              if (!isCustomMode) setCustomModelText(modelValue === "auto" ? "" : modelValue);
            }}
            className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
            title="Nhập tên model tuỳ chỉnh từ API"
          >
            <Edit3 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Provider Option Select */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Nhà cung cấp (Provider)</Label>
          <div className="relative">
            <select
              value={providerValue}
              onChange={(e) => {
                const newProv = e.target.value;
                setIsCustomMode(false);
                let defaultModel = "auto";
                if (newProv === "kokoro-tts") defaultModel = "af_heart";
                else if (newProv === "edge-tts") defaultModel = "en-US-JennyNeural";
                else if (newProv === "browser" && capability === "textToSpeech") defaultModel = "browser-tts";
                else if (newProv === "browser" && capability === "speechToText") defaultModel = "browser-stt";
                onChange(newProv, defaultModel);
              }}
              className="w-full h-10 rounded-xl bg-background border border-input px-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
            >
              {availableProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </div>

        {/* Model Option Select Dropdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Mô hình AI (Option Select)</Label>
            {isRefreshing && (
              <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                <Loader2 className="size-2.5 animate-spin" />
                <span>Đang tải...</span>
              </span>
            )}
          </div>

          {isCustomMode ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                placeholder="Nhập tên model (ví dụ: gemini-2.0-flash, llama-3.3-70b)..."
                value={customModelText}
                onChange={(e) => setCustomModelText(e.target.value)}
                className="rounded-xl text-xs h-10 font-mono flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (customModelText.trim()) {
                    onChange(providerValue, customModelText.trim());
                    setIsCustomMode(false);
                  }
                }}
                className="h-10 px-3.5 rounded-xl text-xs font-semibold shrink-0"
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          ) : (
            <SearchableSelect
              value={modelValue}
              onChange={(val) => {
                onChange(providerValue, val);
              }}
              options={modelOptions}
              placeholder="Chọn model..."
              searchPlaceholder={`Tìm kiếm model (${currentProviderLabel})...`}
            />
          )}
        </div>
      </div>

      {hasFetched && providerValue !== "auto" && currentProviderModels.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Chưa tìm thấy model hỗ trợ {capability} từ {providerValue.toUpperCase()}. Vui lòng kiểm tra API Key ở trên hoặc bấm nút "Làm mới Models".
        </p>
      )}
    </div>
  );
}
