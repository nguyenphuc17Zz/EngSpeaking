import path from "path";
import { createRequire } from "module";
import { sanitizeTextForTTS } from "./browser";
import { logger } from "@/lib/logger";

const require = createRequire(import.meta.url);

export interface KokoroVoiceInfo {
  id: string;
  name: string;
  gender: "female" | "male";
  accent: string;
  description: string;
}

export const KOKORO_VOICES: KokoroVoiceInfo[] = [
  {
    id: "af_heart",
    name: "Heart (US Female)",
    gender: "female",
    accent: "American",
    description: "Giọng nữ Mỹ êm dịu, ngữ điệu tự nhiên nhất (Đề xuất)",
  },
  {
    id: "af_bella",
    name: "Bella (US Female)",
    gender: "female",
    accent: "American",
    description: "Giọng nữ Mỹ tươi vui, năng động",
  },
  {
    id: "af_sarah",
    name: "Sarah (US Female)",
    gender: "female",
    accent: "American",
    description: "Giọng nữ Mỹ phong cách rõ chữ, sư phạm",
  },
  {
    id: "am_adam",
    name: "Adam (US Male)",
    gender: "male",
    accent: "American",
    description: "Giọng nam Mỹ đĩnh đạc, ấm áp",
  },
  {
    id: "am_michael",
    name: "Michael (US Male)",
    gender: "male",
    accent: "American",
    description: "Giọng nam Mỹ tự nhiên, chuẩn mực",
  },
  {
    id: "bf_emma",
    name: "Emma (UK Female)",
    gender: "female",
    accent: "British",
    description: "Giọng nữ Anh thanh lịch, chuẩn mực",
  },
  {
    id: "bm_george",
    name: "George (UK Male)",
    gender: "male",
    accent: "British",
    description: "Giọng nam Anh chuẩn Oxford",
  },
];

export const DEFAULT_KOKORO_VOICE = "af_heart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kokoroModelInstance: any = null;
let isInitializing = false;

/**
 * Khởi tạo hoặc lấy instance KokoroTTS nạp từ thư mục models/tts/kokoro/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getKokoroTTSInstance(): Promise<any> {
  if (kokoroModelInstance) return kokoroModelInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (kokoroModelInstance) return kokoroModelInstance;
  }

  isInitializing = true;
  try {
    const { KokoroTTS } = require("kokoro-js");
    const { env } = require("@huggingface/transformers");

    // Cấu hình cache thư mục models/tts/kokoro của project
    const localModelsDir = path.join(process.cwd(), "models", "tts", "kokoro");
    env.cacheDir = localModelsDir;

    kokoroModelInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
      dtype: "q8",
      device: "cpu",
    });

    return kokoroModelInstance;
  } catch (err) {
    logger.error({ action: "kokoro_init_error", error: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    isInitializing = false;
  }
}

/**
 * Chuyển Float32Array PCM sang Buffer chuẩn định dạng WAV 16-bit
 */
function float32ToWavBuffer(samples: Float32Array, sampleRate = 24000): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.round(int16), offset);
    offset += 2;
  }
  return buffer;
}

export interface SynthesizeKokoroOptions {
  text: string;
  voice?: string;
  speed?: number;
}

/**
 * Tổng hợp giọng đọc offline bằng Kokoro-82M từ thư mục models/
 */
export async function synthesizeKokoroTTS(options: SynthesizeKokoroOptions): Promise<{ audioBuffer: Buffer; mimeType: string }> {
  const cleanText = sanitizeTextForTTS(options.text);
  if (!cleanText) {
    throw new Error("Text cannot be empty for Kokoro TTS");
  }

  const voice = options.voice || DEFAULT_KOKORO_VOICE;
  const speed = options.speed ?? 1.0;

  const tts = await getKokoroTTSInstance();
  const rawAudio = await tts.generate(cleanText, {
    voice,
    speed,
  });

  const wavBuffer = float32ToWavBuffer(rawAudio.audio, rawAudio.sampling_rate || 24000);

  return {
    audioBuffer: wavBuffer,
    mimeType: "audio/wav",
  };
}
