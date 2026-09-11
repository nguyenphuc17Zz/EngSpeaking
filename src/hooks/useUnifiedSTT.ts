"use client";

import { useCallback, useEffect, useState } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useAudioRecorder } from "./useAudioRecorder";
import { transcribeViaServer } from "@/lib/stt/service";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/lib/toast";
import { logger } from "@/lib/logger";

export interface UnifiedSTTOptions {
  lang?: string;
}

export function useUnifiedSTT(options?: UnifiedSTTOptions) {
  const lang = options?.lang || "en-US";
  const sttSettings = useSettingsStore((s) => s.stt);

  const browserSpeech = useSpeechRecognition(lang);
  const audioRecorder = useAudioRecorder();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Always read latest setting from store
  const getProvider = useCallback(() => {
    const current = useSettingsStore.getState().stt?.provider;
    return current || sttSettings?.provider || "browser";
  }, [sttSettings]);

  const getModel = useCallback(() => {
    const current = useSettingsStore.getState().stt?.model;
    return current || sttSettings?.model || "auto";
  }, [sttSettings]);

  // Keep transcript in sync if using browser provider
  useEffect(() => {
    const p = getProvider();
    if (p === "browser") {
      setTranscript(browserSpeech.transcript);
      setInterimTranscript(browserSpeech.interimTranscript);
    }
  }, [browserSpeech.transcript, browserSpeech.interimTranscript, getProvider]);

  const isListening =
    getProvider() === "browser"
      ? browserSpeech.isListening
      : audioRecorder.status === "recording";

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");

    const provider = getProvider();
    if (provider === "browser") {
      browserSpeech.resetTranscript();
      browserSpeech.startListening();
    } else {
      // Pure Whisper mode: only use audioRecorder, no Web Speech
      try {
        await audioRecorder.start();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    }
  }, [getProvider, browserSpeech, audioRecorder]);

  const stopListening = useCallback(async (): Promise<{ text: string; blob?: Blob }> => {
    const provider = getProvider();
    const model = getModel();

    if (provider === "browser") {
      browserSpeech.stopListening();
      // Wait slightly for browser final chunk
      await new Promise((r) => setTimeout(r, 250));
      const finalResult = browserSpeech.fullTranscript.trim() || browserSpeech.transcript.trim();
      setTranscript(finalResult);
      setInterimTranscript("");
      return { text: finalResult };
    }

    // Pure Whisper mode (Offline Whisper ONNX or Groq Whisper)
    if (audioRecorder.status !== "recording") {
      return { text: transcript };
    }

    setIsTranscribing(true);
    try {
      const recording = await audioRecorder.stop();
      const res = await transcribeViaServer(recording.blob, {
        provider: provider === "auto" ? "whisper-local" : provider,
        model,
        language: lang,
      });

      const finalResult = res.text.trim();
      setTranscript(finalResult);
      setInterimTranscript("");
      return { text: finalResult, blob: recording.blob };
    } catch (err) {
      logger.error({ action: "unified_stt_error", error: err instanceof Error ? err.message : String(err) });
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error("Lỗi nhận dạng giọng nói", msg);
      return { text: "" };
    } finally {
      setIsTranscribing(false);
    }
  }, [getProvider, getModel, browserSpeech, audioRecorder, lang, transcript]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    browserSpeech.resetTranscript();
  }, [browserSpeech]);

  const fullTranscript =
    getProvider() === "browser"
      ? browserSpeech.fullTranscript.trim() || browserSpeech.transcript.trim()
      : transcript;

  return {
    status: isListening ? ("recording" as const) : ("idle" as const),
    isListening,
    isTranscribing,
    transcript,
    interimTranscript,
    fullTranscript,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    error: error || (getProvider() === "browser" ? browserSpeech.error : audioRecorder.error),
    isSupported: getProvider() === "browser" ? browserSpeech.isSupported : audioRecorder.isSupported,
    audioRecorder,
    provider: getProvider(),
  };
}
