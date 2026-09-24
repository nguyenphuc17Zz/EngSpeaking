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

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "error"
  | "permission_denied";

export interface UseAudioRecorderOptions {
  keepWarm?: boolean;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0); // Real-time volume: 0 -> 100
  const [isTooQuiet, setIsTooQuiet] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<ReturnType<typeof createAudioRecorder> | null>(null);
  const timerRef = useRef<number | null>(null);
  const isSupported = isRecordingSupported();

  // Web Audio API for Real-time Visualizer & Decibel Meter
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const maxVolumeRef = useRef(0);
  const recordingStartRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setupAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch {
      // Graceful fallback if Web Audio is restricted
    }
  }, []);

  const cleanupAnalyser = useCallback(() => {
    try {
      sourceNodeRef.current?.disconnect();
      sourceNodeRef.current = null;
      analyserRef.current?.disconnect();
      analyserRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } catch {}
    setVolume(0);
    setIsTooQuiet(false);
  }, []);

  const lastTickRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const tick = useCallback(() => {
    if (!mountedRef.current) return;
    const now = Date.now();

    // 1. Duration check
    if (now - lastTickRef.current >= 150) {
      lastTickRef.current = now;
      if (recorderRef.current && mountedRef.current) {
        setDurationMs(recorderRef.current.getDurationMs());
      }
    }

    // 2. Real-time Volume & Silence Metering
    if (analyserRef.current && mountedRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      // Scale smoothly 0 to 100
      const currentVol = Math.min(100, Math.round((avg / 128) * 100));
      setVolume(currentVol);

      if (currentVol > maxVolumeRef.current) {
        maxVolumeRef.current = currentVol;
      }

      // Check if user has been recording for > 1.5s but sound is barely registering (< 6%)
      const elapsed = now - recordingStartRef.current;
      if (elapsed > 1500 && maxVolumeRef.current < 6) {
        setIsTooQuiet(true);
      } else if (maxVolumeRef.current >= 6) {
        setIsTooQuiet(false);
      }
    }

    timerRef.current = requestAnimationFrame(tick);
  }, []);

  // Warmup stream for zero-delay instant start
  const warmup = useCallback(async () => {
    if (streamRef.current && streamRef.current.active) return streamRef.current;
    try {
      const stream = await requestMicrophone();
      streamRef.current = stream;
      setupAnalyser(stream);
      return stream;
    } catch {
      return null;
    }
  }, [setupAnalyser]);

  const start = useCallback(async () => {
    setError(null);
    setIsTooQuiet(false);
    maxVolumeRef.current = 0;
    recordingStartRef.current = Date.now();

    if (!isSupported) {
      setStatus("error");
      setError("Trình duyệt không hỗ trợ ghi âm");
      throw new VoiceEngineError({
        code: VoiceErrorCode.RECORDING_FAILED,
        message: "Recording not supported",
      });
    }

    setStatus("requesting");
    try {
      // Reuse warm stream if active to achieve 0ms zero-latency start
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await requestMicrophone();
        streamRef.current = stream;
      }

      setupAnalyser(stream);

      const recorder = createAudioRecorder(stream);
      recorderRef.current = recorder;
      await recorder.start();

      setStatus("recording");
      setDurationMs(0);
      tick();
    } catch (e: unknown) {
      clearTimer();
      cleanupAnalyser();
      stopStream(streamRef.current);
      streamRef.current = null;
      const name = (e as { name?: string })?.name || "";
      const msg = e instanceof Error ? e.message : String(e);

      if (name === "NotAllowedError" || msg.toLowerCase().includes("permission")) {
        setStatus("permission_denied");
        setError("Microphone bị từ chối");
        throw new VoiceEngineError({
          code: VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
          message: msg,
        });
      }
      if (name === "NotFoundError") {
        setStatus("error");
        setError("Không tìm thấy micro");
        throw new VoiceEngineError({
          code: VoiceErrorCode.MICROPHONE_UNAVAILABLE,
          message: msg,
        });
      }

      setStatus("error");
      setError(msg);
      throw new VoiceEngineError({ code: VoiceErrorCode.RECORDING_FAILED, message: msg });
    }
  }, [isSupported, tick, clearTimer, setupAnalyser, cleanupAnalyser]);

  const stop = useCallback(async (): Promise<AudioRecording> => {
    clearTimer();
    cleanupAnalyser();
    const r = recorderRef.current;
    if (!r) {
      if (!options?.keepWarm) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }
      setStatus("idle");
      throw new VoiceEngineError({
        code: VoiceErrorCode.RECORDING_FAILED,
        message: "Recorder not active",
      });
    }

    try {
      const recording = await r.stop();
      setStatus("idle");
      setDurationMs(recording.durationMs);
      return recording;
    } catch (e: unknown) {
      setStatus("error");
      throw e;
    } finally {
      if (!options?.keepWarm) {
        cleanupAnalyser();
        stopStream(streamRef.current);
        streamRef.current = null;
      }
      recorderRef.current = null;
      setVolume(0);
    }
  }, [clearTimer, cleanupAnalyser, options?.keepWarm]);

  const cancel = useCallback(() => {
    clearTimer();
    cleanupAnalyser();
    try {
      recorderRef.current?.cancel();
    } catch {}
    if (!options?.keepWarm) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    recorderRef.current = null;
    setStatus("idle");
    setDurationMs(0);
    setVolume(0);
  }, [clearTimer, cleanupAnalyser, options?.keepWarm]);

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
      cleanupAnalyser();
      try {
        recorderRef.current?.cancel();
      } catch {}
      stopStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
    };
  }, [clearTimer, cleanupAnalyser]);

  return {
    status,
    durationMs,
    error,
    isSupported,
    mimeType: getSupportedMimeType(),
    volume, // 0 - 100 live volume level
    isTooQuiet, // true if speech audio is too weak
    warmup, // pre-warm mic hardware
    start,
    stop,
    cancel,
    pause,
    resume,
  };
}
