"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/lib/toast";
import { triggerConfetti } from "@/components/ui/confetti";
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Sparkles,
  ExternalLink,
  Cpu,
  RefreshCw,
  ChevronDown,
  Check,
  Zap,
  Radio,
} from "lucide-react";
import type { AIModel } from "@/types/ai";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";

interface ProviderStatus {
  providerId: string;
  configured: boolean;
  maskedKey?: string;
}

interface KeyTestResult {
  success: boolean;
  latencyMs?: number;
  modelsCount?: number;
  message?: string;
  error?: string;
}

export function ApiKeyManager({ onKeyUpdated }: { onKeyUpdated?: () => void }) {
  const settings = useSettingsStore();
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, KeyTestResult>>({});

  const [discoveredModels, setDiscoveredModels] = useState<{
    gemini?: AIModel[];
    groq?: AIModel[];
  }>({});

  const geminiOptions: SearchableOption[] = useMemo(() => {
    let list: SearchableOption[] = [];
    if (discoveredModels.gemini && discoveredModels.gemini.length > 0) {
      list = discoveredModels.gemini.map((m) => ({
        value: m.id,
        label: m.displayName || m.id,
      }));
    } else {
      list = [
        { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (Mặc định)" },
        { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
        { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
      ];
    }

    if (settings.preferredGeminiModel && !list.some((o) => o.value === settings.preferredGeminiModel)) {
      list.unshift({
        value: settings.preferredGeminiModel,
        label: settings.preferredGeminiModel,
        description: "Custom model đã chọn",
      });
    }
    return list;
  }, [discoveredModels.gemini, settings.preferredGeminiModel]);

  const groqOptions: SearchableOption[] = useMemo(() => {
    let list: SearchableOption[] = [];
    if (discoveredModels.groq && discoveredModels.groq.length > 0) {
      list = discoveredModels.groq.map((m) => ({
        value: m.id,
        label: m.displayName || m.id,
      }));
    } else {
      list = [
        { value: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile (Mặc định)" },
        { value: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant (Siêu tốc)" },
        { value: "mixtral-8x7b-32768", label: "mixtral-8x7b-32768" },
      ];
    }

    if (settings.preferredGroqModel && !list.some((o) => o.value === settings.preferredGroqModel)) {
      list.unshift({
        value: settings.preferredGroqModel,
        label: settings.preferredGroqModel,
        description: "Custom model đã chọn",
      });
    }
    return list;
  }, [discoveredModels.groq, settings.preferredGroqModel]);

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/ai/keys");
      const data = await res.json();
      if (data.providers) setStatuses(data.providers);
    } catch {}
  };

  const fetchModelsFor = async (provider: string) => {
    try {
      const res = await fetch(`/api/ai/models?provider=${provider}&live=true`);
      const data = await res.json();
      if (Array.isArray(data.models)) {
        setDiscoveredModels((prev) => ({ ...prev, [provider]: data.models }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatuses();
    fetchModelsFor("gemini");
    fetchModelsFor("groq");
  }, []);

  // Save new key
  const handleSaveKey = async (provider: "gemini" | "groq") => {
    const key = provider === "gemini" ? geminiKey : groqKey;
    if (!key.trim()) {
      toast.error("Vui lòng nhập API Key", `Nhập khóa API cho ${provider.toUpperCase()}`);
      return;
    }

    setLoadingProvider(provider);

    try {
      const res = await fetch("/api/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Xác thực thất bại", data.error || "Không thể kết nối với API Provider");
      } else {
        toast.success(
          `Kết nối thành công ${provider.toUpperCase()}!`,
          `Tìm thấy ${data.modelsCount} models thời gian thực từ tài khoản của bạn.`
        );
        triggerConfetti();

        if (provider === "gemini") setGeminiKey("");
        if (provider === "groq") setGroqKey("");
        if (Array.isArray(data.models) && data.models.length > 0) {
          setDiscoveredModels((prev) => ({ ...prev, [provider]: data.models }));
          // Auto-select first model if not yet set
          if (provider === "gemini") {
            const first = data.models[0].id;
            settings.setPreferredGeminiModel(first);
          } else if (provider === "groq") {
            const first = data.models.find((m: AIModel) => !m.id.includes("whisper"))?.id || data.models[0].id;
            settings.setPreferredGroqModel(first);
          }
        }
        await fetchStatuses();
        if (onKeyUpdated) onKeyUpdated();
      }
    } catch (e: unknown) {
      toast.error("Lỗi kết nối", e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingProvider(null);
    }
  };

  // Test current key health / ping
  const handleTestKey = async (provider: "gemini" | "groq") => {
    setTestingKey(provider);
    try {
      const res = await fetch("/api/ai/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setKeyTestResults((prev) => ({ ...prev, [provider]: data }));

      if (data.success) {
        toast.success(
          `Khóa ${provider.toUpperCase()} hoạt động tốt!`,
          `Phản hồi trong ${data.latencyMs}ms (${data.modelsCount} models khả dụng).`
        );
      } else {
        toast.error(
          `Khóa ${provider.toUpperCase()} kiểm tra thất bại`,
          data.error || "Không thể kết nối hoặc Key hết quota."
        );
      }
    } catch (e: unknown) {
      toast.error("Lỗi kiểm tra Key", e instanceof Error ? e.message : String(e));
    } finally {
      setTestingKey(null);
    }
  };

  // Remove key
  const handleRemoveKey = async (provider: "gemini" | "groq") => {
    if (!confirm(`Bạn có chắc muốn gỡ bỏ API Key cho ${provider.toUpperCase()}?`)) return;

    setLoadingProvider(provider);
    try {
      await fetch(`/api/ai/keys?provider=${provider}`, { method: "DELETE" });
      toast.info(`Đã gỡ bỏ Key ${provider.toUpperCase()}`, "Hệ thống chuyển về cấu hình mặc định.");
      await fetchStatuses();
      setDiscoveredModels((prev) => ({ ...prev, [provider]: [] }));
      setKeyTestResults((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      if (onKeyUpdated) onKeyUpdated();
    } catch {}
    setLoadingProvider(null);
  };

  // Change Gemini Model (Never resets Groq!)
  const handleGeminiModelChange = (modelId: string) => {
    settings.setPreferredGeminiModel(modelId);
    if (settings.activeProvider === "gemini") {
      settings.applyProviderToAll("gemini", modelId);
    }
    toast.success("Đã lưu Model Gemini vĩnh viễn", `Mô hình "${modelId}" đã được ghi nhớ cho Google Gemini.`);
  };

  // Change Groq Model (Never resets Gemini!)
  const handleGroqModelChange = (modelId: string) => {
    if (modelId.includes("whisper")) {
      settings.setStt({ provider: "groq", model: modelId });
      toast.success("Đã lưu mô hình STT", `Mô hình "${modelId}" được áp dụng cho nhận dạng giọng nói.`);
      return;
    }
    settings.setPreferredGroqModel(modelId);
    if (settings.activeProvider === "groq") {
      settings.applyProviderToAll("groq", modelId);
    }
    toast.success("Đã lưu Model Groq vĩnh viễn", `Mô hình "${modelId}" đã được ghi nhớ cho Groq.`);
  };

  // Switch Active Primary Engine
  const handleSetActiveProvider = (provider: "gemini" | "groq") => {
    settings.setActiveProvider(provider);
    const model = provider === "gemini" ? settings.preferredGeminiModel : settings.preferredGroqModel;
    toast.success(
      `Đã chuyển Động cơ chính sang ${provider.toUpperCase()}!`,
      `Tất cả các tác vụ (Sentence Builder, Hội thoại, Đánh giá) hiện đang dùng "${model}".`
    );
  };

  const isGeminiConfigured = statuses.find((s) => s.providerId === "gemini")?.configured;
  const geminiMasked = statuses.find((s) => s.providerId === "gemini")?.maskedKey;

  const isGroqConfigured = statuses.find((s) => s.providerId === "groq")?.configured;
  const groqMasked = statuses.find((s) => s.providerId === "groq")?.maskedKey;

  const isGeminiActive = settings.activeProvider === "gemini";
  const isGroqActive = settings.activeProvider === "groq";

  return (
    <Card className="rounded-3xl border-primary/20 bg-gradient-to-b from-card via-card to-muted/20 shadow-xs overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Key className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Cấu hình API Keys & Live Models</CardTitle>
              <CardDescription className="text-xs">
                Mỗi nhà cung cấp ghi nhớ độc lập Model đã chọn, không bị reset chéo khi chuyển đổi
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStatuses();
              fetchModelsFor("gemini");
              fetchModelsFor("groq");
              toast.info("Đang làm mới danh sách Models từ API...");
            }}
            className="gap-1.5 rounded-xl text-xs h-8 btn-spring"
          >
            <RefreshCw className="size-3.5" />
            <span>Làm mới Models</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          {/* ==================== Google Gemini Card ==================== */}
          <div
            className={`p-4 rounded-2xl bg-card border shadow-xs space-y-4 transition-all ${
              isGeminiActive ? "border-primary/80 ring-2 ring-primary/20 bg-primary/2" : "border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Google Gemini API</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isGeminiActive && (
                  <Badge className="text-[10px] font-semibold bg-primary text-primary-foreground">
                    ⚡ Đang là Động cơ chính
                  </Badge>
                )}
                <Badge
                  variant={isGeminiConfigured ? "outline" : "secondary"}
                  className="text-[10px] font-mono border-primary/30 text-primary"
                >
                  {isGeminiConfigured ? "✓ Đã kết nối" : "Chưa cấu hình"}
                </Badge>
              </div>
            </div>

            {/* Configured Key Details + Test Key Button */}
            {isGeminiConfigured && geminiMasked && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-muted/40 border border-border/40 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{geminiMasked}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey("gemini")}
                      disabled={testingKey === "gemini"}
                      className="h-6 text-[10px] px-2 rounded-lg font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      title="Gửi request kiểm tra key thực tế và đo độ trễ"
                    >
                      {testingKey === "gemini" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Zap className="size-3 text-amber-500" />
                      )}
                      <span>{testingKey === "gemini" ? "Đang ping..." : "Kiểm tra Key"}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveKey("gemini")}
                      className="size-6 text-destructive hover:bg-destructive/10"
                      title="Xóa Key"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Key Health Ping Test Result Banner */}
                {keyTestResults.gemini && (
                  <div
                    className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in-0 ${
                      keyTestResults.gemini.success
                        ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {keyTestResults.gemini.success ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="size-3.5 text-red-500 shrink-0" />
                      )}
                      <span className="text-[11px] font-medium leading-tight">
                        {keyTestResults.gemini.success
                          ? `Key hợp lệ • Độ trễ: ${keyTestResults.gemini.latencyMs}ms (${keyTestResults.gemini.modelsCount} models)`
                          : keyTestResults.gemini.error}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isGeminiConfigured ? "Thay đổi Key mới:" : "Nhập Gemini API Key:"}
              </Label>
              <div className="relative">
                <Input
                  type={showGemini ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="rounded-xl text-xs pr-9 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowGemini(!showGemini)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 text-muted-foreground"
                >
                  {showGemini ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleSaveKey("gemini")}
                disabled={loadingProvider === "gemini" || !geminiKey.trim()}
                className="gap-1.5 rounded-xl text-xs font-semibold h-8 flex-1 btn-spring"
              >
                {loadingProvider === "gemini" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                <span>Lưu & Kích hoạt Key</span>
              </Button>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 shrink-0"
              >
                <span>Lấy key Google</span>
                <ExternalLink className="size-3" />
              </a>
            </div>

            {/* Gemini Model Select (Remembers settings.preferredGeminiModel independently!) */}
            <div className="space-y-2 pt-3 border-t border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Model Gemini ({discoveredModels.gemini?.length || 0} models từ API):
                </Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  ✓ Lưu độc lập
                </span>
              </div>
              <SearchableSelect
                value={settings.preferredGeminiModel}
                onChange={handleGeminiModelChange}
                options={geminiOptions}
                placeholder="Chọn model Gemini..."
                searchPlaceholder="Tìm kiếm model Gemini (flash, pro, lite...)"
                triggerClassName="h-9"
              />

              {/* Action Button: Set as Primary Engine */}
              {!isGeminiActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetActiveProvider("gemini")}
                  className="w-full h-8 text-xs font-semibold rounded-xl gap-1.5 border-primary/40 text-primary hover:bg-primary/10 btn-spring"
                >
                  <Radio className="size-3.5" />
                  <span>Kích hoạt Gemini làm Động cơ chính</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="size-3.5" />
                  <span>Toàn bộ phòng tập đang sử dụng Gemini ({settings.preferredGeminiModel})</span>
                </div>
              )}
            </div>
          </div>

          {/* ==================== Groq Card ==================== */}
          <div
            className={`p-4 rounded-2xl bg-card border shadow-xs space-y-4 transition-all ${
              isGroqActive ? "border-orange-500/80 ring-2 ring-orange-500/20 bg-orange-500/2" : "border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-orange-500" />
                <span className="font-bold text-sm text-foreground">Groq API (Llama + Whisper)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isGroqActive && (
                  <Badge className="text-[10px] font-semibold bg-orange-500 text-white">
                    ⚡ Đang là Động cơ chính
                  </Badge>
                )}
                <Badge
                  variant={isGroqConfigured ? "outline" : "secondary"}
                  className="text-[10px] font-mono border-orange-500/30 text-orange-600 dark:text-orange-400"
                >
                  {isGroqConfigured ? "✓ Đã kết nối" : "Chưa cấu hình"}
                </Badge>
              </div>
            </div>

            {/* Configured Key Details + Test Key Button */}
            {isGroqConfigured && groqMasked && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-muted/40 border border-border/40 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{groqMasked}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey("groq")}
                      disabled={testingKey === "groq"}
                      className="h-6 text-[10px] px-2 rounded-lg font-semibold gap-1 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                      title="Gửi request kiểm tra key thực tế và đo độ trễ"
                    >
                      {testingKey === "groq" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Zap className="size-3 text-orange-500" />
                      )}
                      <span>{testingKey === "groq" ? "Đang ping..." : "Kiểm tra Key"}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveKey("groq")}
                      className="size-6 text-destructive hover:bg-destructive/10"
                      title="Xóa Key"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Key Health Ping Test Result Banner */}
                {keyTestResults.groq && (
                  <div
                    className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in-0 ${
                      keyTestResults.groq.success
                        ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {keyTestResults.groq.success ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="size-3.5 text-red-500 shrink-0" />
                      )}
                      <span className="text-[11px] font-medium leading-tight">
                        {keyTestResults.groq.success
                          ? `Key hợp lệ • Độ trễ: ${keyTestResults.groq.latencyMs}ms (${keyTestResults.groq.modelsCount} models)`
                          : keyTestResults.groq.error}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isGroqConfigured ? "Thay đổi Key mới:" : "Nhập Groq API Key:"}
              </Label>
              <div className="relative">
                <Input
                  type={showGroq ? "text" : "password"}
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="rounded-xl text-xs pr-9 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowGroq(!showGroq)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 text-muted-foreground"
                >
                  {showGroq ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleSaveKey("groq")}
                disabled={loadingProvider === "groq" || !groqKey.trim()}
                className="gap-1.5 rounded-xl text-xs font-semibold h-8 flex-1 btn-spring"
              >
                {loadingProvider === "groq" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                <span>Lưu & Kích hoạt Key</span>
              </Button>

              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 shrink-0"
              >
                <span>Lấy key Groq</span>
                <ExternalLink className="size-3" />
              </a>
            </div>

            {/* Groq Model Select (Remembers settings.preferredGroqModel independently!) */}
            <div className="space-y-2 pt-3 border-t border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Model Groq ({discoveredModels.groq?.length || 0} models từ API):
                </Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  ✓ Lưu độc lập
                </span>
              </div>
              <SearchableSelect
                value={settings.preferredGroqModel}
                onChange={handleGroqModelChange}
                options={groqOptions}
                placeholder="Chọn model Groq..."
                searchPlaceholder="Tìm kiếm model Groq (llama, mixtral...)"
                triggerClassName="h-9"
              />

              {/* Action Button: Set as Primary Engine */}
              {!isGroqActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetActiveProvider("groq")}
                  className="w-full h-8 text-xs font-semibold rounded-xl gap-1.5 border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 btn-spring"
                >
                  <Radio className="size-3.5" />
                  <span>Kích hoạt Groq làm Động cơ chính</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                  <Check className="size-3.5" />
                  <span>Toàn bộ phòng tập đang sử dụng Groq ({settings.preferredGroqModel})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
