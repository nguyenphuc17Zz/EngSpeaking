"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAudioRecorder,
  getSupportedMimeType,
  isRecordingSupported,
  requestMicrophone,
  stopStream,
} from "@/lib/audio/recorder";
import type { AudioRecording } from "@/types/audio";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "error" | "permission_denied";

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<ReturnType<typeof createAudioRecorder> | null>(null);
  const timerRef = useRef<number | null>(null);
  const isSupported = isRecordingSupported();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lastTickRef = useRef<number>(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const tick = useCallback(() => {
    if (!mountedRef.current) return;
    const now = Date.now();
    if (now - lastTickRef.current >= 250) {
      lastTickRef.current = now;
      if (recorderRef.current && mountedRef.current) setDurationMs(recorderRef.current.getDurationMs());
    }
    timerRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setStatus("error");
      setError("Trình duyệt không hỗ trợ ghi âm");
      throw new VoiceEngineError({ code: VoiceErrorCode.RECORDING_FAILED, message: "Recording not supported" });
    }
    setStatus("requesting");
    try {
      const stream = await requestMicrophone();
      streamRef.current = stream;
      const recorder = createAudioRecorder(stream);
      recorderRef.current = recorder;
      await recorder.start();
      setStatus("recording");
      setDurationMs(0);
      tick();
    } catch (e: unknown) {
      clearTimer();
      stopStream(streamRef.current);
      streamRef.current = null;
      const name = (e as { name?: string })?.name || "";
      const msg = e instanceof Error ? e.message : String(e);
      if (name === "NotAllowedError" || msg.toLowerCase().includes("permission")) {
        setStatus("permission_denied");
        setError("Microphone bị từ chối");
        throw new VoiceEngineError({ code: VoiceErrorCode.MICROPHONE_PERMISSION_DENIED, message: msg });
      }
      if (name === "NotFoundError") {
        setStatus("error");
        setError("Không tìm thấy micro");
        throw new VoiceEngineError({ code: VoiceErrorCode.MICROPHONE_UNAVAILABLE, message: msg });
      }
      setStatus("error");
      setError(msg);
      throw new VoiceEngineError({ code: VoiceErrorCode.RECORDING_FAILED, message: msg });
    }
  }, [isSupported, tick, clearTimer]);

  const stop = useCallback(async (): Promise<AudioRecording> => {
    clearTimer();
    const r = recorderRef.current;
    if (!r) throw new VoiceEngineError({ code: VoiceErrorCode.RECORDING_FAILED, message: "Recorder not active" });
    try {
      const recording = await r.stop();
      setStatus("idle");
      setDurationMs(recording.durationMs);
      stopStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
      return recording;
    } catch (e: unknown) {
      stopStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
      setStatus("error");
      throw e;
    }
  }, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    try { recorderRef.current?.cancel(); } catch {}
    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    setStatus("idle");
    setDurationMs(0);
  }, [clearTimer]);

  const pause = useCallback(() => {
    recorderRef.current?.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    recorderRef.current?.resume();
    setStatus("recording");
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      try { recorderRef.current?.cancel(); } catch {}
      stopStream(streamRef.current);
    };
  }, [clearTimer]);

  return {
    status,
    durationMs,
    error,
    isSupported,
    mimeType: getSupportedMimeType(),
    start,
    stop,
    cancel,
    pause,
    resume,
  };
}
