// Reusable audio playback §14 — no memory leaks from object URLs
import type { PlaybackState } from "@/types/audio";

export interface AudioPlayer {
  play(blob: Blob): Promise<void>;
  playUrl(url: string): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(timeMs: number): void;
  getCurrentTimeMs(): number;
  getDurationMs(): number;
  getState(): PlaybackState;
  setPlaybackRate(rate: number): void;
  destroy(): void;
  onStateChange(cb: (s: PlaybackState) => void): () => void;
  onProgress(cb: (currentMs: number, durationMs: number) => void): () => void;
  onEnded(cb: () => void): () => void;
}

export function createAudioPlayer(): AudioPlayer {
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let state: PlaybackState = "idle";
  const stateCbs = new Set<(s: PlaybackState) => void>();
  const progressCbs = new Set<(c: number, d: number) => void>();
  const endedCbs = new Set<() => void>();

  function setState(s: PlaybackState) {
    state = s;
    for (const cb of stateCbs) cb(s);
  }

  let onTimeUpdate: (() => void) | null = null;
  let onEnded: (() => void) | null = null;
  let onPause: (() => void) | null = null;
  let onPlaying: (() => void) | null = null;
  let onError: (() => void) | null = null;

  function ensureAudio(): HTMLAudioElement {
    if (audio) return audio;
    const a = new Audio();
    a.preload = "auto";
    onTimeUpdate = () => {
      for (const cb of progressCbs) cb(a.currentTime * 1000, (isNaN(a.duration) ? 0 : a.duration * 1000));
    };
    onEnded = () => {
      setState("ended");
      for (const cb of endedCbs) cb();
    };
    onPause = () => {
      if (a.ended) return;
      if (state === "playing") setState("paused");
    };
    onPlaying = () => setState("playing");
    onError = () => setState("error");
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("error", onError);
    audio = a;
    return a;
  }

  function revokeUrl() {
    if (objectUrl) {
      try { URL.revokeObjectURL(objectUrl); } catch {}
      objectUrl = null;
    }
  }

  return {
    play: async (blob: Blob) => {
      const a = ensureAudio();
      revokeUrl();
      objectUrl = URL.createObjectURL(blob);
      a.src = objectUrl;
      setState("loading");
      try {
        await a.play();
        setState("playing");
      } catch (e) {
        setState("error");
        throw e;
      }
    },
    playUrl: async (url: string) => {
      const a = ensureAudio();
      revokeUrl();
      a.src = url;
      setState("loading");
      try {
        await a.play();
        setState("playing");
      } catch (e) {
        setState("error");
        throw e;
      }
    },
    pause: () => {
      audio?.pause();
      setState("paused");
    },
    resume: async () => {
      if (!audio) return;
      try {
        await audio.play();
        setState("playing");
      } catch {}
    },
    stop: () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      setState("idle");
      revokeUrl();
      audio.removeAttribute("src");
      audio.load();
    },
    seek: (timeMs: number) => {
      if (!audio || isNaN(audio.duration)) return;
      audio.currentTime = Math.max(0, Math.min(timeMs / 1000, audio.duration));
    },
    getCurrentTimeMs: () => (audio ? audio.currentTime * 1000 : 0),
    getDurationMs: () => (audio && !isNaN(audio.duration) ? audio.duration * 1000 : 0),
    getState: () => state,
    setPlaybackRate: (rate: number) => {
      if (audio) audio.playbackRate = rate;
    },
    destroy: () => {
      try { audio?.pause(); } catch {}
      revokeUrl();
      if (audio) {
        if (onTimeUpdate) audio.removeEventListener("timeupdate", onTimeUpdate);
        if (onEnded) audio.removeEventListener("ended", onEnded);
        if (onPause) audio.removeEventListener("pause", onPause);
        if (onPlaying) audio.removeEventListener("playing", onPlaying);
        if (onError) audio.removeEventListener("error", onError);
        audio.src = "";
        audio.load();
      }
      audio = null;
      stateCbs.clear();
      progressCbs.clear();
      endedCbs.clear();
      setState("idle");
    },
    onStateChange: (cb) => { stateCbs.add(cb); return () => stateCbs.delete(cb); },
    onProgress: (cb) => { progressCbs.add(cb); return () => progressCbs.delete(cb); },
    onEnded: (cb) => { endedCbs.add(cb); return () => endedCbs.delete(cb); },
  };
}
