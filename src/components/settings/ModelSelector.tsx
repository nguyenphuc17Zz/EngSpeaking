"use client";

import { useEffect, useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AIModel } from "@/types/ai";
import { RefreshCw, Sparkles, Edit3, Check, Loader2, ChevronDown } from "lucide-react";

interface Props {
  label: string;
  description?: string;
  providerValue: string;
  modelValue: string;
  capability: "textGeneration" | "speechToText" | "textToSpeech";
  onChange: (provider: string, model: string) => void;
}

const PROVIDERS = [
  { id: "auto", label: "Tự động (Auto AI Router)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "groq", label: "Groq (Llama / Whisper)" },
  { id: "browser", label: "Trình duyệt (Browser STT/TTS)" },
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

  // Group models by provider for optgroup display
  const geminiModels = models.filter((m) => m.providerId === "gemini");
  const groqModels = models.filter((m) => m.providerId === "groq");
  const browserModels = models.filter((m) => m.providerId === "browser");
  const mockModels = models.filter((m) => m.providerId === "mock");

  // Determine current provider models
  const currentProviderModels =
    providerValue === "auto"
      ? models
      : models.filter((m) => m.providerId === providerValue);

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
      {/* Header with Title and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <span>{label}</span>
            {currentProviderModels.length > 0 && providerValue !== "auto" && (
              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-2 h-5">
                {currentProviderModels.length} models từ API
              </Badge>
            )}
          </h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
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
                onChange(newProv, "auto");
              }}
              className="w-full h-10 rounded-xl bg-background border border-input px-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
            >
              {PROVIDERS.map((p) => (
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
            <div className="relative">
              <select
                value={modelValue}
                onChange={(e) => {
                  onChange(providerValue, e.target.value);
                }}
                className="w-full h-10 rounded-xl bg-background border border-input px-3 pr-8 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
              >
                <option value="auto">⚡ Tự động (Auto AI Router)</option>

                {/* If provider is AUTO: show optgroups for all discovered models */}
                {providerValue === "auto" ? (
                  <>
                    {geminiModels.length > 0 && (
                      <optgroup label="── Google Gemini Models (Live API) ──">
                        {geminiModels.map((m) => (
                          <option key={`gemini_${m.id}`} value={m.id}>
                            {m.displayName || m.id}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {groqModels.length > 0 && (
                      <optgroup label="── Groq Models (Live API) ──">
                        {groqModels.map((m) => (
                          <option key={`groq_${m.id}`} value={m.id}>
                            {m.displayName || m.id}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {browserModels.length > 0 && (
                      <optgroup label="── Trình duyệt (Browser) ──">
                        {browserModels.map((m) => (
                          <option key={`browser_${m.id}`} value={m.id}>
                            {m.displayName || m.id}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  /* Single provider models */
                  currentProviderModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName || m.id}
                    </option>
                  ))
                )}

                {/* Custom fallback if model not in list */}
                {modelValue &&
                  modelValue !== "auto" &&
                  !models.some((m) => m.id === modelValue) && (
                    <option value={modelValue}>
                      {modelValue} (Custom)
                    </option>
                  )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
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
