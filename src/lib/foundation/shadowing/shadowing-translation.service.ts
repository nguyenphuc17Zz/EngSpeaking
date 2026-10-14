import type { CorodomoSegment } from "./corodomo-presets";

/**
 * Free Google Translate API client for English to Vietnamese
 * Uses Google's public endpoint (no API key required, reliable for single sentences).
 */
export async function translateEnToVi(text: string, signal?: AbortSignal): Promise<string> {
  if (!text || !text.trim() || signal?.aborted) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text.trim())}`;
    const response = await fetch(url, signal ? { signal } : undefined);
    if (!response.ok) {
      throw new Error(`Google Translate HTTP ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0]
        .map((item: any) => item?.[0])
        .filter(Boolean)
        .join("");
    }
    return "";
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) return "";
    console.warn("[GoogleTranslate] Translation failed:", err);
    return "";
  }
}

export interface TranslateSegmentsOptions {
  /** Index of the sentence to prioritize translating first (e.g. currently active sentence) */
  priorityIndex?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
  /** Realtime streaming callback triggered immediately whenever each sentence finishes translating */
  onSegmentDone?: (updatedSegments: CorodomoSegment[], translatedIdx: number) => void;
  /** Optional AbortSignal to stop in-flight workers when video changes or component unmounts */
  signal?: AbortSignal;
}

/**
 * High-performance Progressive Streaming Translation Engine for English Shadowing Transcripts.
 * - Prioritizes the active/selected sentence first (displays in ~0.2s).
 * - Streams translations for all other sentences in real-time as they finish.
 * - Concurrency-limited (4 parallel workers) with rate-limit protection.
 */
export async function translateTranscriptSegments(
  segments: CorodomoSegment[],
  options?:
    | TranslateSegmentsOptions
    | ((completed: number, total: number) => void),
  onSegmentDoneLegacy?: (updatedSegments: CorodomoSegment[], translatedIdx: number) => void
): Promise<CorodomoSegment[]> {
  if (!Array.isArray(segments) || segments.length === 0) return segments;

  const opts: TranslateSegmentsOptions =
    typeof options === "function"
      ? { onProgress: options, onSegmentDone: onSegmentDoneLegacy }
      : options || {};

  const total = segments.length;
  let completed = 0;
  const result: CorodomoSegment[] = [...segments];

  // Identify segments needing translation
  const pendingIndices: number[] = [];

  // 1. Put priorityIndex at the very top of the queue if it needs translation
  const pIdx = opts.priorityIndex;
  if (typeof pIdx === "number" && pIdx >= 0 && pIdx < segments.length) {
    const pSeg = segments[pIdx];
    if (!pSeg.translationVi && pSeg.text?.trim()) {
      pendingIndices.push(pIdx);
    }
  }

  // 2. Queue remaining segments
  for (let i = 0; i < segments.length; i++) {
    if (i === pIdx) continue;
    const seg = segments[i];
    if (!seg.translationVi && seg.text?.trim()) {
      pendingIndices.push(i);
    } else {
      completed++;
    }
  }

  opts.onProgress?.(completed, total);

  if (pendingIndices.length === 0 || opts.signal?.aborted) {
    return result;
  }

  // Concurrency worker queue (4 concurrent workers to protect against Google rate limits)
  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < pendingIndices.length && !opts.signal?.aborted) {
      const idx = pendingIndices[cursor++];
      const seg = result[idx];
      if (!seg) continue;

      try {
        const vi = await translateEnToVi(seg.text, opts.signal);
        if (opts.signal?.aborted) break;
        if (vi) {
          result[idx] = {
            ...seg,
            translationVi: vi,
          };
          opts.onSegmentDone?.(result, idx);
        }
      } catch (err) {
        if (opts.signal?.aborted) break;
        console.warn(`[TranslationService] Error translating segment ${idx}:`, err);
      } finally {
        if (!opts.signal?.aborted) {
          completed++;
          opts.onProgress?.(completed, total);
        }
      }

      if (opts.signal?.aborted) break;
      // Small delay between calls to be respectful to the free endpoint
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, pendingIndices.length) },
    () => worker()
  );

  await Promise.all(workers);
  return result;
}
