import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { sanitizeTextForTTS } from "./browser";

export interface EdgeVoiceInfo {
  id: string;
  name: string;
  gender: "female" | "male";
  locale: string;
  accent: string;
  description: string;
}

export const EDGE_NEURAL_VOICES: EdgeVoiceInfo[] = [
  {
    id: "en-US-JennyNeural",
    name: "Jenny (US)",
    gender: "female",
    locale: "en-US",
    accent: "American",
    description: "Giọng nữ Mỹ tự nhiên, ấm áp, ngữ điệu đàm thoại xuất sắc (Khuyên dùng)",
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy (US)",
    gender: "male",
    locale: "en-US",
    accent: "American",
    description: "Giọng nam Mỹ trầm ấm, đĩnh đạc, phát âm chuẩn mực",
  },
  {
    id: "en-US-AriaNeural",
    name: "Aria (US)",
    gender: "female",
    locale: "en-US",
    accent: "American",
    description: "Giọng nữ Mỹ truyền cảm, phong cách sư phạm, nhấn âm rất rõ",
  },
  {
    id: "en-GB-SoniaNeural",
    name: "Sonia (UK)",
    gender: "female",
    locale: "en-GB",
    accent: "British",
    description: "Giọng nữ Anh chuẩn BBC/Oxford, thanh lịch, chuẩn mực",
  },
  {
    id: "en-GB-RyanNeural",
    name: "Ryan (UK)",
    gender: "male",
    locale: "en-GB",
    accent: "British",
    description: "Giọng nam Anh chuẩn mực RP (Received Pronunciation)",
  },
  {
    id: "en-AU-NatashaNeural",
    name: "Natasha (AU)",
    gender: "female",
    locale: "en-AU",
    accent: "Australian",
    description: "Giọng nữ Úc tự nhiên, tươi vui, phát âm bản xứ",
  },
];

export const DEFAULT_EDGE_VOICE = "en-US-JennyNeural";

export interface SynthesizeEdgeTTSOptions {
  text: string;
  voice?: string;
  speed?: number; // e.g. 1.0 = normal, 0.8 = slow, 1.2 = fast
  pitch?: string;
}

/**
 * Chuyển đổi speed factor (ví dụ 0.85 hoặc 1.1) sang format Prosody rate của Edge (ví dụ "-15%", "+10%")
 */
function formatRate(speed?: number): string | undefined {
  if (!speed || speed === 1) return undefined;
  const pct = Math.round((speed - 1) * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

/**
 * Tổng hợp phát âm chất lượng cao qua Microsoft Edge Neural TTS
 */
export async function synthesizeEdgeTTS(options: SynthesizeEdgeTTSOptions): Promise<{ audioBuffer: Buffer; mimeType: string }> {
  const cleanText = sanitizeTextForTTS(options.text);
  if (!cleanText) {
    throw new Error("Text cannot be empty for Edge TTS");
  }

  const voiceName = options.voice || DEFAULT_EDGE_VOICE;
  const tts = new MsEdgeTTS();

  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const rate = formatRate(options.speed);
    const { audioStream } = tts.toStream(cleanText, rate ? { rate } : undefined);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }

    const audioBuffer = Buffer.concat(chunks);
    return {
      audioBuffer,
      mimeType: "audio/mpeg",
    };
  } finally {
    try {
      tts.close();
    } catch {
      // Ignore close errors
    }
  }
}
