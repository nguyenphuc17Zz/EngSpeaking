// Browser TTS via speechSynthesis §20 — primary TTS per user choice
import type { SpeechSynthesisInput, SpeechSynthesisResult } from "@/types/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";

export interface BrowserTTSOptions extends SpeechSynthesisInput {
  voice?: string;
  speed?: number;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Làm sạch văn bản cho TTS:
 * Biến các dấu gạch dưới đục lỗ (______) thành khoảng dừng ngắt giọng tự nhiên (comma / pause),
 * loại bỏ hoàn toàn hiện tượng giọng đọc đọc lặp 'underscore underscore...'.
 */
export function sanitizeTextForTTS(text: string): string {
  if (!text) return "";
  return text
    // Chỗ trống ở cuối câu trước dấu chấm: e.g. "to finish ______." -> "to finish..."
    .replace(/_{2,}\s*([.!?])/g, "...$1")
    // Chỗ trống ở giữa câu: e.g. "had to ______ to" -> "had to, to" (tạo ngắt giọng 0.3s)
    .replace(/_{2,}/g, ", ")
    // Ký tự gạch dưới đơn lẻ
    .replace(/_{1}/g, " ")
    // Ký tự gạch ngang lặp lại
    .replace(/-{2,}/g, ", ")
    // Dọn dẹp khoảng trắng trước dấu phẩy và dấu chấm
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    // Dọn dẹp dấu phẩy thừa
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\.{4,}/g, "...")
    // Chuẩn hoá khoảng trắng
    .replace(/\s+/g, " ")
    .trim();
}

export function isBrowserTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (!isBrowserTTSSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function speakWithBrowser(input: BrowserTTSOptions): Promise<SpeechSynthesisResult> {
  return new Promise((resolve, reject) => {
    if (!isBrowserTTSSupported()) {
      reject(new VoiceEngineError({ code: VoiceErrorCode.TTS_FAILED, message: "Browser TTS not supported" }));
      return;
    }
    // Cancel previous
    try { window.speechSynthesis.cancel(); } catch {}
    const cleanText = sanitizeTextForTTS(input.text);
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = input.language || "en-US";
    utter.rate = input.speed ?? 1.0;
    utter.pitch = 1.0;
    if (input.voice) {
      const voices = getBrowserVoices();
      const found = voices.find((v) => v.name === input.voice || v.voiceURI === input.voice);
      if (found) utter.voice = found;
    } else {
      // Prefer English voice
      const voices = getBrowserVoices();
      const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en")) || voices[0];
      if (enVoice) utter.voice = enVoice;
    }
    const start = Date.now();
    const durationEst = Math.max(500, input.text.length * 55);
    // Empty audio blob placeholder — browser speech is direct, no Blob needed for playback via Audio element.
    // We still return a blob for interface uniformity (wav silence) but playback uses speechSynthesis directly elsewhere.
    const silentBlob = new Blob([new Uint8Array([0])], { type: "audio/wav" });

    utter.onend = () => {
      activeUtterance = null;
      resolve({ audio: silentBlob, mimeType: "audio/wav", durationMs: Date.now() - start || durationEst, provider: "browser", model: "browser-tts" });
    };
    utter.onerror = (e) => {
      activeUtterance = null;
      reject(new VoiceEngineError({ code: VoiceErrorCode.TTS_FAILED, message: `TTS error: ${(e as unknown as { error?: string }).error || "unknown"}`, raw: e }));
    };
    activeUtterance = utter;
    window.speechSynthesis.speak(utter);
  });
}

export function stopBrowserTTS() {
  if (!isBrowserTTSSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
  activeUtterance = null;
}

export function pauseBrowserTTS() {
  try { window.speechSynthesis.pause(); } catch {}
}

export function resumeBrowserTTS() {
  try { window.speechSynthesis.resume(); } catch {}
}
