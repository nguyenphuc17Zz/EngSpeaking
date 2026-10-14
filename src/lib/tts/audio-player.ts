"use client";

import { sanitizeTextForTTS } from "./browser";
import { useSettingsStore } from "@/stores/settings-store";

// Cache in-memory: key -> object URL (bounded LRU)
const MAX_AUDIO_CACHE_SIZE = 50;
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
 * Sinh key cache cho một đoạn text + voice + provider (không phụ thuộc speed để tái sử dụng audio 1.0x)
 */
function getCacheKey(text: string, voice?: string, provider?: string): string {
  return `${provider || "default"}:${voice || "default"}:${text.trim().toLowerCase()}`;
}

/**
 * Giải phóng toàn bộ Object URL trong cache
 */
export function clearAudioBlobCache(): void {
  for (const url of audioBlobCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  audioBlobCache.clear();
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
 * Lấy hoặc tải audio URL từ cache hoặc API /api/ai/speak (luôn tải ở tốc độ chuẩn 1.0x)
 */
export async function getOrFetchAudioUrl(
  text: string,
  voice?: string,
  _speed?: number,
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

  const key = getCacheKey(clean, resolvedVoice, inferredProvider);
  const cachedUrl = audioBlobCache.get(key);
  if (cachedUrl) {
    // Refresh LRU order
    audioBlobCache.delete(key);
    audioBlobCache.set(key, cachedUrl);
    return cachedUrl;
  }

  // Luôn gọi endpoint /api/ai/speak với speed = 1.0, tốc độ phát thực tế chỉnh qua audio.playbackRate
  const params = new URLSearchParams({
    text: clean,
    voice: resolvedVoice,
    provider: inferredProvider,
    speed: "1.0",
  });

  const res = await fetch(`/api/ai/speak?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch TTS audio: ${res.statusText}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  if (audioBlobCache.has(key)) {
    const prevUrl = audioBlobCache.get(key);
    audioBlobCache.delete(key);
    if (prevUrl && prevUrl !== url) {
      try {
        URL.revokeObjectURL(prevUrl);
      } catch {}
    }
  } else if (audioBlobCache.size >= MAX_AUDIO_CACHE_SIZE) {
    const oldest = audioBlobCache.entries().next().value as [string, string] | undefined;
    if (oldest) {
      audioBlobCache.delete(oldest[0]);
      try {
        URL.revokeObjectURL(oldest[1]);
      } catch {}
    }
  }

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

      const globalSpeed = typeof window !== "undefined" ? useSettingsStore.getState().ttsSpeed ?? 1.0 : 1.0;
      const targetSpeed = options.speed ?? globalSpeed;

      const url = await getOrFetchAudioUrl(options.text, options.voice, 1.0, options.provider);
      const audio = new Audio(url);
      currentAudio = audio;

      const rate = Number.isFinite(targetSpeed) && targetSpeed > 0 ? targetSpeed : 1.0;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;

      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        options.onEnded?.();
        resolve();
      };

      audio.onerror = () => {
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
