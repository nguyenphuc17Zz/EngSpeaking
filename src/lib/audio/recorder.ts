// Reusable recording abstraction §13
import type { AudioRecording } from "@/types/audio";

export interface AudioRecorder {
  start(): Promise<void>;
  stop(): Promise<AudioRecording>;
  pause(): void;
  resume(): void;
  cancel(): void;
  getDurationMs(): number;
  getState(): "inactive" | "recording" | "paused";
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/wav",
];

export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const t of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {}
  }
  return "audio/webm";
}

export function createAudioRecorder(stream: MediaStream): AudioRecorder {
  const mimeType = getSupportedMimeType();
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startTime = 0;
  let pausedDuration = 0;
  let pauseStart = 0;
  let state: "inactive" | "recording" | "paused" = "inactive";

  const getDurationMs = () => {
    if (state === "inactive") return pausedDuration;
    if (state === "paused") return pausedDuration;
    return Date.now() - startTime - pausedDuration;
  };

  return {
    start: async () => {
      if (state !== "inactive") throw new Error("Recorder already started");
      chunks = [];
      pausedDuration = 0;
      const mr = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      recorder = mr;
      startTime = Date.now();
      state = "recording";
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mr.start(100);
      // Wait for start
      await new Promise<void>((resolve, reject) => {
        mr.onstart = () => resolve();
        mr.onerror = (ev: unknown) => reject(ev);
        setTimeout(() => resolve(), 100); // fallback if onstart not fired
      });
    },
    stop: async () => {
      const r = recorder;
      if (!r || state === "inactive") throw new Error("Recorder not started");
      const durationMs = getDurationMs();
      state = "inactive";
      const blob = await new Promise<Blob>((resolve, reject) => {
        r.onstop = () => {
          stopStream(stream);
          const b = new Blob(chunks, { type: mimeType });
          resolve(b);
        };
        r.onerror = (ev: unknown) => {
          stopStream(stream);
          reject(ev);
        };
        try {
          r.stop();
        } catch (e) {
          stopStream(stream);
          reject(e);
        }
      });
      recorder = null;
      chunks = [];
      return { blob, mimeType, durationMs };
    },
    pause: () => {
      if (state !== "recording" || !recorder) return;
      try {
        recorder.pause();
        pauseStart = Date.now();
        state = "paused";
      } catch {}
    },
    resume: () => {
      if (state !== "paused" || !recorder) return;
      try {
        recorder.resume();
        pausedDuration += Date.now() - pauseStart;
        state = "recording";
      } catch {}
    },
    cancel: () => {
      try {
        recorder?.stop();
      } catch {}
      stopStream(stream);
      recorder = null;
      chunks = [];
      state = "inactive";
      pausedDuration = 0;
    },
    getDurationMs,
    getState: () => state,
  };
}

// Microphone permission helpers §12
export interface MicrophoneRequestOptions {
  deviceId?: string;
  sampleRate?: number;
}

export async function requestMicrophone(options?: MicrophoneRequestOptions): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("MediaDevices not supported");
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: options?.deviceId ? { exact: options.deviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: options?.sampleRate || { ideal: 48000, min: 16000 },
      channelCount: 1,
      // Advanced WebRTC clarity constraints (Chrome / Edge)
      // @ts-ignore
      googEchoCancellation: true,
      // @ts-ignore
      googAutoGainControl: true,
      // @ts-ignore
      googNoiseSuppression: true,
      // @ts-ignore
      googHighpassFilter: true,
      // @ts-ignore
      googAudioMirroring: false,
    },
  });
}

export function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  try {
    for (const t of stream.getTracks()) {
      try {
        t.enabled = false;
        t.stop();
      } catch {}
    }
  } catch {}
}

export function isRecordingSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}
