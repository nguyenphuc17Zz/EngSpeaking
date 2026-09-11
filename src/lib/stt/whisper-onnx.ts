import path from "path";
import { createRequire } from "module";
import { WaveFile } from "wavefile";
import { logger } from "@/lib/logger";

const require = createRequire(import.meta.url);

export interface WhisperModelInfo {
  id: string;
  name: string;
  description: string;
  modelKey: string;
}

export const WHISPER_MODELS: WhisperModelInfo[] = [
  {
    id: "whisper-tiny-en-onnx",
    name: "Whisper Tiny English (Quantized ONNX)",
    description: "Model siêu nhẹ ~40MB, tốc độ nhận diện nhanh nhất trên CPU",
    modelKey: "onnx-community/whisper-tiny.en",
  },
  {
    id: "whisper-base-en-onnx",
    name: "Whisper Base English (Quantized ONNX)",
    description: "Model cân bằng ~73MB, độ chính xác cao hơn cho các câu phức tạp",
    modelKey: "onnx-community/whisper-base.en",
  },
];

export const DEFAULT_WHISPER_MODEL = "whisper-tiny-en-onnx";

// Cache instances in memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transcriberInstances = new Map<string, any>();
const initializingPromises = new Map<string, Promise<unknown>>();

/**
 * Lấy hoặc khởi tạo instance Whisper ASR pipeline từ thư mục models/stt/whisper/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getWhisperTranscriber(modelId = DEFAULT_WHISPER_MODEL): Promise<any> {
  const modelInfo = WHISPER_MODELS.find((m) => m.id === modelId) || WHISPER_MODELS[0];
  const modelKey = modelInfo.modelKey;

  if (transcriberInstances.has(modelKey)) {
    return transcriberInstances.get(modelKey);
  }

  if (initializingPromises.has(modelKey)) {
    await initializingPromises.get(modelKey);
    return transcriberInstances.get(modelKey);
  }

  const initPromise = (async () => {
    try {
      const { pipeline, env } = require("@huggingface/transformers");

      const localModelsDir = path.join(process.cwd(), "models", "stt", "whisper");
      env.cacheDir = localModelsDir;

      const instance = await pipeline("automatic-speech-recognition", modelKey, {
        dtype: "q8",
        device: "cpu",
      });

      transcriberInstances.set(modelKey, instance);
      return instance;
    } catch (err) {
      logger.error({ action: "whisper_init_error", error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      initializingPromises.delete(modelKey);
    }
  })();

  initializingPromises.set(modelKey, initPromise);
  return initPromise;
}

/**
 * Chuyển đổi Buffer âm thanh WAV thành mảng Float32Array 16kHz mono tương thích Whisper
 */
export function convertWavToFloat32(wavBuffer: Buffer): Float32Array {
  try {
    const wav = new WaveFile(wavBuffer);
    wav.toBitDepth("32f");
    wav.toSampleRate(16000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSamples = (wav as any).getSamples(false, Float32Array);

    if (Array.isArray(rawSamples)) {
      if (rawSamples.length > 1) {
        const left = rawSamples[0] as Float32Array;
        const right = rawSamples[1] as Float32Array;
        const mono = new Float32Array(left.length);
        for (let i = 0; i < left.length; ++i) {
          mono[i] = (left[i] + right[i]) / 2;
        }
        return mono;
      }
      return rawSamples[0] as Float32Array;
    }

    return rawSamples as Float32Array;
  } catch (err) {
    logger.error({ action: "wav_conversion_error", error: err instanceof Error ? err.message : String(err) });
    throw new Error("Không thể giải mã dữ liệu âm thanh WAV");
  }
}

export interface TranscribeWhisperOptions {
  audioBuffer: Buffer;
  mimeType?: string;
  model?: string;
  language?: string;
}

/**
 * Nhận dạng giọng nói Offline bằng Whisper ONNX từ thư mục models/
 */
export async function transcribeWithWhisperONNX(
  options: TranscribeWhisperOptions
): Promise<{ text: string; model: string }> {
  const modelId = options.model || DEFAULT_WHISPER_MODEL;
  const modelInfo = WHISPER_MODELS.find((m) => m.id === modelId) || WHISPER_MODELS[0];
  const transcriber = await getWhisperTranscriber(modelId);

  // Chuyển đổi âm thanh sang Float32Array 16kHz
  const float32Samples = convertWavToFloat32(options.audioBuffer);

  const generateOptions: Record<string, unknown> = {
    return_timestamps: false,
  };

  const isEnglishOnly = modelInfo.modelKey.endsWith(".en");
  if (!isEnglishOnly && options.language) {
    generateOptions.language = options.language;
    generateOptions.task = "transcribe";
  }

  const output = await transcriber(float32Samples, generateOptions);

  const recognizedText = typeof output?.text === "string" ? output.text.trim() : "";

  return {
    text: recognizedText,
    model: modelId,
  };
}
