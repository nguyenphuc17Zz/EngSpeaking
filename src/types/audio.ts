// Audio types for Phase 1
export interface AudioRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export type RecordingState = "idle" | "requesting_permission" | "ready" | "recording" | "paused";

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export interface AudioLevel {
  rms: number; // 0-1
  db: number; // -Infinity to 0
}
