// STT service — abstracts client STT (browser) vs server STT (Groq/Whisper) with DSP Voice Amplification
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";
import { useSettingsStore } from "@/stores/settings-store";

export interface STTOptions {
  language?: string;
  provider: string;
  model: string;
}

export interface AudioEnhanceOptions {
  autoNormalize?: boolean;
  micGain?: number;
  noiseFloorGate?: boolean;
}

export interface ProcessedAudioResult {
  blob: Blob;
  originalPeak: number;
  amplifiedPeak: number;
  appliedGainDb: number;
  appliedGainFactor: number;
}

/**
 * Chuyển đổi Float32Array PCM sang Blob WAV 16-bit PCM 16kHz
 */
function encodeWavBlob(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, 36 + samples.length * 2, true);
  // 'WAVE'
  view.setUint8(8, 0x57);  // 'W'
  view.setUint8(9, 0x41);  // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'
  // 'fmt '
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6d); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // 'data'
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Thuật toán DSP: Tự động giải mã âm thanh từ MediaRecorder trình duyệt (WebM/Opus/MP4),
 * đo đỉnh biên độ (Peak), chuẩn hóa âm lượng (Auto Normalization) và áp dụng Soft-Knee Limiter
 * để khuếch đại giọng nhỏ/thì thầm lên mức chuẩn studio mà không bị vỡ/rè tiếng.
 */
export async function convertBlobTo16kHzWav(
  blob: Blob,
  options?: AudioEnhanceOptions
): Promise<ProcessedAudioResult> {
  if (typeof window === "undefined") {
    return { blob, originalPeak: 1, amplifiedPeak: 1, appliedGainDb: 0, appliedGainFactor: 1 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    return { blob, originalPeak: 1, amplifiedPeak: 1, appliedGainDb: 0, appliedGainFactor: 1 };
  }

  try {
    const audioCtx = new AudioCtx();
    const arrayBuffer = await blob.arrayBuffer();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const targetLength = Math.max(1, Math.round(decodedBuffer.duration * targetSampleRate));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineCtx) {
      await audioCtx.close().catch(() => {});
      return { blob, originalPeak: 1, amplifiedPeak: 1, appliedGainDb: 0, appliedGainFactor: 1 };
    }

    const offlineCtx = new OfflineCtx(1, targetLength, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampledBuffer = await offlineCtx.startRendering();
    await audioCtx.close().catch(() => {});

    const monoData = resampledBuffer.getChannelData(0);

    // 1. Đo đỉnh biên độ cực đại (Peak Amplitude)
    let originalPeak = 0;
    for (let i = 0; i < monoData.length; i++) {
      const abs = Math.abs(monoData[i]);
      if (abs > originalPeak) originalPeak = abs;
    }

    // 2. Tính toán hệ số khuếch đại (Gain Factor)
    const TARGET_PEAK = 0.85; // -1.41 dBFS chuẩn âm lượng tối ưu cho Whisper ASR
    const NOISE_FLOOR = 0.005; // Ngưỡng yên tĩnh để tránh boost tiếng xì nền
    const userMicGain = Math.max(1.0, Math.min(options?.micGain ?? 1.5, 3.0));
    const autoNormalize = options?.autoNormalize !== false;

    let gainFactor = userMicGain;
    if (autoNormalize && originalPeak >= NOISE_FLOOR) {
      // Tự động scale đưa đỉnh âm lượng về TARGET_PEAK
      const normalizeGain = TARGET_PEAK / originalPeak;
      // Kết hợp độ nhạy người dùng chọn và tự động chuẩn hóa, chặn trần an toàn ở 8.0x (+18dB)
      gainFactor = Math.min(Math.max(normalizeGain, userMicGain), 8.0);
    } else if (originalPeak < NOISE_FLOOR && (options?.noiseFloorGate !== false)) {
      // Vùng yên tĩnh: giữ nguyên âm lượng tránh kích tiếng ù gió
      gainFactor = 1.0;
    }

    // 3. Áp dụng Soft-Knee Limiter (Hyperbolic Tangent Saturation) chống rè/vỡ tiếng
    const amplifiedSamples = new Float32Array(monoData.length);
    let amplifiedPeak = 0;

    for (let i = 0; i < monoData.length; i++) {
      const boosted = monoData[i] * gainFactor;
      let finalSample = boosted;

      // Nén mềm bão hòa nếu biên độ vượt quá ngưỡng 0.92
      if (boosted > 0.92) {
        finalSample = 0.92 + 0.08 * Math.tanh((boosted - 0.92) / 0.08);
      } else if (boosted < -0.92) {
        finalSample = -0.92 + 0.08 * Math.tanh((boosted + 0.92) / 0.08);
      }

      amplifiedSamples[i] = finalSample;
      const abs = Math.abs(finalSample);
      if (abs > amplifiedPeak) amplifiedPeak = abs;
    }

    const appliedGainDb = Number((20 * Math.log10(gainFactor)).toFixed(1));
    const wavBlob = encodeWavBlob(amplifiedSamples, targetSampleRate);

    return {
      blob: wavBlob,
      originalPeak: Number(originalPeak.toFixed(3)),
      amplifiedPeak: Number(amplifiedPeak.toFixed(3)),
      appliedGainFactor: Number(gainFactor.toFixed(2)),
      appliedGainDb,
    };
  } catch {
    return { blob, originalPeak: 1, amplifiedPeak: 1, appliedGainDb: 0, appliedGainFactor: 1 };
  }
}

/**
 * Server STT via /api/ai/transcribe (Whisper ONNX / Groq Whisper)
 * Used when provider !== browser
 */
export async function transcribeViaServer(
  audio: Blob,
  opts: STTOptions
): Promise<{
  text: string;
  rawText: string;
  provider: string;
  model: string;
  amplification?: {
    originalPeak: number;
    amplifiedPeak: number;
    appliedGainDb: number;
    appliedGainFactor: number;
  };
}> {
  // Tối ưu hoá & Khuếch đại DSP: Chuyển đổi sang 16kHz WAV và tự động kéo biên độ
  let processedAudio = audio;
  let ampMetrics: ProcessedAudioResult | null = null;

  try {
    const audioEnhancement = useSettingsStore.getState().audioEnhancement;
    ampMetrics = await convertBlobTo16kHzWav(audio, audioEnhancement);
    processedAudio = ampMetrics.blob;
  } catch {}

  const fileExt = processedAudio.type.includes("wav") ? "wav" : (processedAudio.type.split("/")[1]?.split(";")[0] || "webm");
  const form = new FormData();
  form.append("audio", processedAudio, `recording.${fileExt}`);
  form.append("provider", opts.provider);
  form.append("model", opts.model);
  form.append("language", opts.language || "en-US");
  const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || "STT failed";
    throw new VoiceEngineError({ code: VoiceErrorCode.STT_FAILED, message: msg, provider: opts.provider, model: opts.model });
  }
  const t = data.result?.text ?? "";
  // Preserve distinction raw vs display §16
  return {
    text: t.trim(),
    rawText: t,
    provider: data.result?.provider || opts.provider,
    model: data.result?.model || opts.model,
    amplification: ampMetrics ? {
      originalPeak: ampMetrics.originalPeak,
      amplifiedPeak: ampMetrics.amplifiedPeak,
      appliedGainDb: ampMetrics.appliedGainDb,
      appliedGainFactor: ampMetrics.appliedGainFactor,
    } : undefined,
  };
}

export function normalizeTranscript(raw: string): string {
  // Faithful to user's speech §16 — no silent rewrite, just trim
  return raw.trim();
}
