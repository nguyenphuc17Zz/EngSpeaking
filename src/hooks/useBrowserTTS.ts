"use client";

import { useCallback, useEffect, useState } from "react";
import { speakWithBrowser, stopBrowserTTS, isBrowserTTSSupported, getBrowserVoices } from "@/lib/tts/browser";

export function useBrowserTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => isBrowserTTSSupported());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isSupported) return;
    const load = () => setVoices(getBrowserVoices());
    load();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null as unknown as () => void;
    };
  }, [isSupported]);

  const speak = useCallback(async (text: string, opts?: { voice?: string; rate?: number; lang?: string }) => {
    if (!text.trim()) return;
    setIsSpeaking(true);
    try {
      await speakWithBrowser({ text, voice: opts?.voice, speed: opts?.rate ?? 1, language: opts?.lang || "en-US" });
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopBrowserTTS();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, isSupported, voices, speak, stop };
}
