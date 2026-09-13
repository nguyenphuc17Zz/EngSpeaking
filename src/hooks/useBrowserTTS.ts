"use client";

import { useCallback, useEffect, useState } from "react";
import { speakWithBrowser, stopBrowserTTS, isBrowserTTSSupported, getBrowserVoices } from "@/lib/tts/browser";
import { playEdgeAudio, stopEdgeAudio } from "@/lib/tts/audio-player";
import { useSettingsStore } from "@/stores/settings-store";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";

export function useBrowserTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => isBrowserTTSSupported() || typeof window !== "undefined");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const ttsSettings = useSettingsStore((s) => s.tts);

  useEffect(() => {
    if (!isBrowserTTSSupported()) return;
    const load = () => setVoices(getBrowserVoices());
    load();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null as unknown as () => void;
      }
    };
  }, []);

  const speak = useCallback(
    async (text: string, opts?: { voice?: string; rate?: number; lang?: string }) => {
      if (!text || !text.trim()) return;
      setIsSpeaking(true);

      // Always read latest settings from store to guard against pre-hydration default values
      const currentTts = useSettingsStore.getState().tts || ttsSettings;
      const globalSpeed = useSettingsStore.getState().ttsSpeed ?? 1.0;
      const targetSpeed = opts?.rate ?? globalSpeed;

      const provider = currentTts?.provider || "edge-tts";
      const preferredModel = currentTts?.model || "en-US-JennyNeural";

      let selectedVoice = opts?.voice || preferredModel;
      if (provider === "kokoro-tts" || provider === "kokoro") {
        if (!selectedVoice || selectedVoice === "auto" || selectedVoice === "kokoro-tts") {
          selectedVoice = "af_heart";
        }
      } else if (provider === "edge-tts") {
        if (!selectedVoice || selectedVoice === "auto" || selectedVoice === "edge-tts") {
          selectedVoice = "en-US-JennyNeural";
        }
      }

      try {
        // Nếu cấu hình dùng Edge TTS, Kokoro TTS hoặc Auto
        if (provider === "edge-tts" || provider === "kokoro-tts" || provider === "kokoro" || provider === "auto") {
          try {
            await playEdgeAudio({
              text,
              voice: selectedVoice,
              provider,
              speed: targetSpeed,
            });
            return;
          } catch (ttsErr) {
            logger.debug("tts_fallback", {
              error: ttsErr instanceof Error ? ttsErr.message : String(ttsErr),
            });
            const providerName =
              provider === "kokoro-tts" || provider === "kokoro" || selectedVoice.startsWith("af_")
                ? "Kokoro-82M"
                : "Edge-TTS";
            toast.warning(
              "Tạm thời dùng giọng trình duyệt",
              `Không thể phát âm qua ${providerName}. Đang tạm thời chuyển sang giọng trình duyệt.`
            );
          }
        }

        // Browser TTS (nếu người dùng chủ động chọn hoặc fallback khi offline)
        await speakWithBrowser({
          text,
          voice: opts?.voice,
          speed: targetSpeed,
          language: opts?.lang || "en-US",
        });
      } catch (browserErr) {
        logger.error({
          action: "browser_tts_error",
          error: browserErr instanceof Error ? browserErr.message : String(browserErr),
        });
      } finally {
        setIsSpeaking(false);
      }
    },
    [ttsSettings]
  );

  const stop = useCallback(() => {
    stopEdgeAudio();
    stopBrowserTTS();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, isSupported, voices, speak, stop };
}

// Alias thuận tiện cho các component mới
export const useTTS = useBrowserTTS;
