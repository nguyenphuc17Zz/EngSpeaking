"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Browser Web Speech API wrapper per spec §15-16 — preserves raw transcript fidelity
export function useSpeechRecognition(lang = "en-US") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<unknown>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
        || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      setIsSupported(!!SR);
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
  }, []);

  const cleanup = useCallback(() => {
    const rec = recognitionRef.current as {
      onstart?: unknown;
      onresult?: unknown;
      onerror?: unknown;
      onend?: unknown;
      abort?: () => void;
      stop?: () => void;
    } | null;
    if (rec) {
      try {
        rec.abort?.();
      } catch {
        try {
          rec.stop?.();
        } catch {}
      }
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) { setError("Web Speech API không hỗ trợ trên trình duyệt này"); return; }
    shouldListenRef.current = true;
    setError(null);
    clearTimers();
    cleanup();

    const spawn = () => {
      if (!shouldListenRef.current) return;
      try {
        const SRClass = SR as new () => {
          lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
          start: () => void; abort: () => void;
          onstart: ((e: unknown) => void) | null;
          onresult: ((e: { resultIndex: number; results: Array<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
          onerror: ((e: { error: string }) => void) | null;
          onend: (() => void) | null;
        };
        const rec = new SRClass();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.onstart = () => { setIsListening(true); setInterimTranscript(""); };
        rec.onresult = (event) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const r = event.results[i];
            const chunk = r[0]?.transcript || "";
            if (r.isFinal) final += chunk;
            else interim += chunk;
          }
          if (final) setTranscript((prev) => (prev ? `${prev} ${final}` : final));
          setInterimTranscript(interim);
        };
        rec.onerror = (e) => {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setError("Microphone bị từ chối");
            shouldListenRef.current = false;
            setIsListening(false);
          } else if (e.error !== "no-speech") {
            setError(e.error);
          }
        };
        rec.onend = () => {
          setInterimTranscript("");
          if (shouldListenRef.current) {
            clearTimers();
            restartTimerRef.current = setTimeout(() => { if (shouldListenRef.current) spawn(); }, 80);
          } else setIsListening(false);
        };
        recognitionRef.current = rec;
        rec.start();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        if (shouldListenRef.current) {
          restartTimerRef.current = setTimeout(() => { if (shouldListenRef.current) spawn(); }, 150);
        }
      }
    };
    spawn();
  }, [lang, clearTimers, cleanup]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    clearTimers();
    cleanup();
    setIsListening(false);
    setInterimTranscript("");
  }, [clearTimers, cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearTimers();
      cleanup();
    };
  }, [clearTimers, cleanup]);

  const fullTranscript = `${transcript} ${interimTranscript}`.trim();

  return { isListening, transcript, interimTranscript, fullTranscript, startListening, stopListening, resetTranscript, isSupported, error, setTranscript };
}
