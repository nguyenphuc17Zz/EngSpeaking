"use client";

import { sanitizeTextForTTS } from "./browser";

// Cache in-memory: key -> object URL
const audioBlobCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;

export interface PlayAudioOptions {
  text: string;
  voice?: string;
  provider?: string;
  speed?: number;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Sinh key cache cho một đoạn text + voice + speed + provider
 */
function getCacheKey(text: string, voice?: string, speed?: number, provider?: string): string {
  return `${provider || "default"}_${voice || "default"}_${speed || 1}_${text.trim().toLowerCase()}`;
}

/**
 * Dừng hoàn toàn âm thanh đang phát
 */
export function stopEdgeAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
}

/**
 * Tạm dừng âm thanh
 */
export function pauseEdgeAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {}
  }
}

/**
 * Tiếp tục phát âm thanh
 */
export function resumeEdgeAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.play();
    } catch {}
  }
}

/**
 * Lấy hoặc tải audio URL từ cache hoặc API /api/ai/speak
 */
export async function getOrFetchAudioUrl(
  text: string,
  voice?: string,
  speed?: number,
  provider?: string
): Promise<string> {
  const clean = sanitizeTextForTTS(text);
  if (!clean) throw new Error("Empty text");

  const isKokoroVoice = Boolean(
    voice && (voice.startsWith("af_") || voice.startsWith("am_") || voice.startsWith("bf_") || voice.startsWith("bm_"))
  );
  const inferredProvider =
    provider === "kokoro-tts" || provider === "kokoro" || (provider === "auto" && isKokoroVoice)
      ? "kokoro-tts"
      : provider === "edge-tts"
      ? "edge-tts"
      : isKokoroVoice
      ? "kokoro-tts"
      : "edge-tts";

  const defaultVoice = inferredProvider === "kokoro-tts" ? "af_heart" : "en-US-JennyNeural";
  const resolvedVoice =
    !voice || voice === "auto" || voice === "kokoro-tts" || voice === "edge-tts"
      ? defaultVoice
      : voice;

  const key = getCacheKey(clean, resolvedVoice, speed, inferredProvider);
  const cachedUrl = audioBlobCache.get(key);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Gọi endpoint /api/ai/speak
  const params = new URLSearchParams({
    text: clean,
    voice: resolvedVoice,
    provider: inferredProvider,
    speed: (speed || 1.0).toString(),
  });

  const res = await fetch(`/api/ai/speak?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch TTS audio: ${res.statusText}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  audioBlobCache.set(key, url);
  return url;
}

/**
 * Phát âm thanh qua HTML5 Audio với Edge Neural Voice hoặc Kokoro Offline
 */
export function playEdgeAudio(options: PlayAudioOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      stopEdgeAudio();

      const url = await getOrFetchAudioUrl(options.text, options.voice, options.speed, options.provider);
      const audio = new Audio(url);
      currentAudio = audio;

      if (options.speed && options.speed !== 1) {
        audio.playbackRate = options.speed;
      }

      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        options.onEnded?.();
        resolve();
      };

      audio.onerror = (e) => {
        if (currentAudio === audio) currentAudio = null;
        const err = new Error(`Audio playback error`);
        options.onError?.(err);
        reject(err);
      };

      await audio.play();
    } catch (err) {
      stopEdgeAudio();
      options.onError?.(err);
      reject(err);
    }
  });
}
